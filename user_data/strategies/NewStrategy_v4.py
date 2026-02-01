from freqtrade.strategy import IStrategy
from freqtrade.strategy import IntParameter, DecimalParameter, BooleanParameter, CategoricalParameter
from pandas import DataFrame
import talib.abstract as ta
import freqtrade.vendor.qtpylib.indicators as qtpylib
import numpy as np

class NewStrategy_v4(IStrategy): # MODIFIED: Renamed class to NewStrategy_v4
    INTERFACE_VERSION = 3
    timeframe = '5m'
    
    # MODIFIED: Optimized minimal_roi settings for improved profit taking (from _v3)
    minimal_roi = {
        "0": 0.03,  # Immediate profit target increased to 3%
        "120": 0.02, # Profit target after 2 hours (120 minutes)
        "240": 0.01  # Profit target after 4 hours (240 minutes)
    }

    stoploss = -0.05

    # ADDED: Dynamic stoploss settings (from _v3)
    trailing_stop = True
    trailing_stop_positive = 0.01 # Activate trailing stop when profit reaches 1%
    trailing_stop_positive_offset = 0.02 # Trail 2% below the highest profit point
    trailing_only_offset_is_reached = True # Only trigger stop if positive offset reached

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        
        # ADDED: EMA indicators for trend filtering (from _v3)
        dataframe['ema50'] = ta.EMA(dataframe, timeperiod=50)
        dataframe['ema200'] = ta.EMA(dataframe, timeperiod=200)

        # ADDED: Volume Moving Average for entry signal reliability (from _v3)
        dataframe['volume_ma'] = ta.SMA(dataframe['volume'], timeperiod=20)
        
        # ADDED: ADX and ATR indicators for trend strength and volatility (Improvement 3)
        dataframe['adx'] = ta.ADX(dataframe, timeperiod=14)
        dataframe['atr'] = ta.ATR(dataframe, timeperiod=14) # ATR is added as per description but not directly used in this iteration for entry/exit.
        
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (qtpylib.crossed_above(dataframe['rsi'], 30)) & # MODIFIED: Changed RSI condition to 'crossed_above 30' for reversal signal (from _v3)
            (qtpylib.crossed_above(dataframe['close'], dataframe['ema50'])) & # MODIFIED: Changed from `close > ema50` to `crossed_above(close, ema50)` for a dip-buying recovery signal (Improvement 1)
            (dataframe['ema50'] > dataframe['ema200']) & # Existing: Overall strong uptrend
            (dataframe['volume'] > dataframe['volume_ma'] * 0.8) & # MODIFIED: Relaxed volume condition by lowering threshold to 80% of volume_ma (from _v3)
            (dataframe['adx'] > 25), # ADDED: ADX filter to ensure a strong trend is present (Improvement 3)
            'enter_long'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # MODIFIED: Removed RSI exit condition to rely more on minimal_roi and trailing stop for optimal profit taking (Improvement 2)
        # The previous condition was: (dataframe['rsi'] > 60)
        # By not setting 'exit_long' explicitly based on RSI or any other condition here,
        # the strategy relies solely on the configured minimal_roi, stoploss, and trailing_stop for exiting positions.
        return dataframe

    # ADDED: Note for backtesting environment strengthening (Improvement 4)
    # To strengthen backtest, use: --timerange 20200101-20231231 --data-format JSON
    # This helps in forward testing and validating robustness across different market conditions.
    # It is critical to run backtests with an extended timerange to properly evaluate strategy performance.
    # For NewStrategy_v4, consider an even longer range if data is available, e.g., 20180101-20240101.