from freqtrade.strategy import IStrategy
from freqtrade.strategy import IntParameter, DecimalParameter, BooleanParameter, CategoricalParameter
from pandas import DataFrame
import talib.abstract as ta
import freqtrade.vendor.qtpylib.indicators as qtpylib
import numpy as np
from datetime import datetime # ADDED: For custom_stoploss (Improvement 4)
from freqtrade.persistence import Trade # ADDED: For custom_stoploss (Improvement 4)

class NewStrategy_v6(IStrategy): # MODIFIED: Renamed class to NewStrategy_v6
    INTERFACE_VERSION = 3
    timeframe = '5m'
    
    # MODIFIED: minimal_roi settings adjusted for more realistic profit taking (Improvement 2)
    minimal_roi = {
        "0": 0.015,  # Immediate profit target lowered to 1.5%
        "60": 0.01,  # Profit target after 1 hour (60 minutes)
        "120": 0.005 # Profit target after 2 hours (120 minutes)
    }

    stoploss = -0.05 # MODIFIED: This remains a fixed base stoploss, custom stoploss will override when active.

    # ADDED: Dynamic stoploss settings (from _v3)
    trailing_stop = True
    trailing_stop_positive = 0.008 # MODIFIED: Activate trailing stop when profit reaches 0.8% (Improvement 2)
    trailing_stop_positive_offset = 0.01 # MODIFIED: Trail 1% below the highest profit point (Improvement 2)
    trailing_only_offset_is_reached = True # Only trigger stop if positive offset reached

    # ADDED: Use custom_stoploss for ATR-based stoploss (Improvement 4)
    use_custom_stoploss = True # ADDED: Enable custom stoploss (Improvement 4)

    # ADDED: Hyperopt parameters for entry conditions (Improvement 3 in original, now part of Improvement 1)
    # MODIFIED: Adjusted ranges for wider optimization and flexibility (Improvement 1)
    rsi_entry_value = IntParameter(30, 60, default=40, space='buy', optimize=True) # MODIFIED: RSI upper limit expanded for more entry opportunities (Improvement 1)
    adx_entry_value = IntParameter(10, 30, default=20, space='buy', optimize=True) # MODIFIED: ADX lower limit reduced for more entry opportunities (Improvement 1)
    volume_ma_multiplier = DecimalParameter(0.5, 1.2, default=0.8, space='buy', optimize=True)

    # ADDED: Hyperopt parameter for ATR-based custom stoploss (Improvement 4)
    atr_stoploss_multiplier = DecimalParameter(1.0, 5.0, default=2.0, space='stoploss', optimize=True) # ADDED: Multiplier for ATR-based dynamic stoploss (Improvement 4)

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        
        # ADDED: EMA indicators for trend filtering (from _v3)
        dataframe['ema50'] = ta.EMA(dataframe, timeperiod=50)
        dataframe['ema200'] = ta.EMA(dataframe, timeperiod=200)

        # ADDED: Volume Moving Average for entry signal reliability (from _v3)
        dataframe['volume_ma'] = ta.SMA(dataframe['volume'], timeperiod=20)
        
        # ADDED: ADX and ATR indicators for trend strength and volatility (Improvement 3 in original, now Improvement 4 for ATR use)
        dataframe['adx'] = ta.ADX(dataframe, timeperiod=14)
        dataframe['atr'] = ta.ATR(dataframe, timeperiod=14) # ATR is calculated, now also used in custom_stoploss (Improvement 4)
        
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe['rsi'] < self.rsi_entry_value.value) & # MODIFIED: RSI condition remains optimizable
            (dataframe['close'] > dataframe['ema50']) & # MODIFIED: Close above EMA50
            (dataframe['ema50'] > dataframe['ema200']) & # Existing: Overall strong uptrend
            (dataframe['volume'] > dataframe['volume_ma'] * self.volume_ma_multiplier.value) & # MODIFIED: Volume multiplier is optimizable
            (dataframe['adx'] > self.adx_entry_value.value), # MODIFIED: ADX condition remains optimizable
            'enter_long'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # MODIFIED: Added indicator-based exit conditions (Improvement 3)
        dataframe.loc[
            (dataframe['rsi'] > 70) |  # ADDED: Exit if RSI enters overbought area (Improvement 3)
            (qtpylib.crossed_below(dataframe['close'], dataframe['ema50'])) | # ADDED: Exit if close crosses below EMA50 (trend reversal signal) (Improvement 3)
            (dataframe['adx'] < 15), # ADDED: Exit if ADX drops below 15 (trend weakening) (Improvement 3)
            'exit_long'] = 1
        return dataframe

    # ADDED: Custom stoploss function using ATR (Improvement 4)
    def custom_stoploss(self, pair: str, trade: 'Trade', current_time: datetime, current_rate: float, current_profit: float, **kwargs) -> float:
        # Get the dataframe for the current pair and timeframe
        dataframe, _ = self.dp.get_pair_dataframe(pair, self.timeframe)
        
        # Ensure there's enough data for ATR calculation
        if len(dataframe) < 1:
            return self.stoploss # Fallback to default stoploss if no data

        # Get the latest ATR value
        # Use .iloc[-1] for the most recent completed candle's ATR
        latest_atr = dataframe['atr'].iloc[-1] 

        # Calculate dynamic stoploss based on ATR and multiplier
        # The stoploss value is a positive percentage, so we return 1.0 - (entry_price - atr_value*multiplier)/entry_price
        # Or simply, the percentage from the entry price, e.g., if entry is 100 and stoploss is 98, that's 2%
        # Freqtrade expects a positive float, e.g., 0.05 for 5% stoploss
        
        # Calculate the actual monetary stoploss distance from current_rate
        atr_stop_distance = latest_atr * self.atr_stoploss_multiplier.value
        
        # Calculate the percentage stoploss from the trade entry rate
        # trade.open_rate is the price at which the trade was opened
        # We want the stoploss to be relative to the entry price to lock in a maximum loss
        
        # The stoploss in Freqtrade is relative to the `trade.open_rate` and is a negative percentage.
        # But `custom_stoploss` returns a positive value if it wants to override, which Freqtrade will then convert to negative.
        # Example: if trade.open_rate = 100, atr_stop_distance = 2, then stop_price = 98.
        # The percentage would be (100 - 98) / 100 = 0.02.
        # Freqtrade expects this as a positive float here.
        
        calculated_stoploss_percent = atr_stop_distance / trade.open_rate
        
        # Ensure the calculated stoploss is not smaller than a reasonable base (e.g., 1%)
        # or greater than the original fixed stoploss to prevent overly tight/loose stops
        # For this example, we'll just use the calculated one.
        # The `stoploss` attribute (e.g., -0.05) is the hard floor.
        # `custom_stoploss` should return a POSITIVE value which indicates the maximal loss allowed
        # from the entry price. For example, if trade.open_rate = 100, and we want stop at 98,
        # then (100-98)/100 = 0.02 is returned.
        
        # If the current profit is positive and trailing_stop is active,
        # we might want to adjust the stop upwards, but trailing_stop handles that.
        # custom_stoploss is primarily for dynamic *initial* or *base* stoploss based on volatility.
        
        return max(abs(self.stoploss), calculated_stoploss_percent) # Ensure it's at least the base stoploss percentage (as positive value) (Improvement 4)

    # ADDED: Note for backtesting environment strengthening (Improvement 1)
    # MODIFIED: Updated backtesting command to reflect extended timerange and --pairs-file suggested in Improvement 1
    # To strengthen backtest, use: freqtrade backtest --strategy NewStrategy_v6 --timerange 20180101-20240101 --data-format JSON --pairs-file <your_pairs_file.json>
    # This helps in forward testing and validating robustness across different market conditions.
    # It is critical to run backtests with an extended timerange to properly evaluate strategy performance.
    # Also remember to run hyperopt for parameters: freqtrade hyperopt -s NewStrategy_v6 --epochs 100 --hyperopt-loss Short --timerange 20180101-20240101 --data-format JSON --pairs-file <your_pairs_file.json>