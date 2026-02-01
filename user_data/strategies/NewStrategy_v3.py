from freqtrade.strategy import IStrategy
from freqtrade.strategy import IntParameter, DecimalParameter, BooleanParameter, CategoricalParameter
from pandas import DataFrame
import talib.abstract as ta
import freqtrade.vendor.qtpylib.indicators as qtpylib
import numpy as np

class NewStrategy_v3(IStrategy): # MODIFIED: Renamed class to NewStrategy_v3
    INTERFACE_VERSION = 3
    timeframe = '5m'
    
    # MODIFIED: Optimized minimal_roi settings for improved profit taking
    minimal_roi = {
        "0": 0.03,  # Immediate profit target increased to 3%
        "120": 0.02, # Profit target after 2 hours (120 minutes)
        "240": 0.01  # Profit target after 4 hours (240 minutes)
    }

    stoploss = -0.05

    # ADDED: Dynamic stoploss settings
    trailing_stop = True
    trailing_stop_positive = 0.01 # Activate trailing stop when profit reaches 1%
    trailing_stop_positive_offset = 0.02 # Trail 2% below the highest profit point
    trailing_only_offset_is_reached = True # Only trigger stop if positive offset reached

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        
        # ADDED: EMA indicators for trend filtering
        dataframe['ema50'] = ta.EMA(dataframe, timeperiod=50)
        dataframe['ema200'] = ta.EMA(dataframe, timeperiod=200)

        # ADDED: Volume Moving Average for entry signal reliability
        dataframe['volume_ma'] = ta.SMA(dataframe['volume'], timeperiod=20)
        
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (qtpylib.crossed_above(dataframe['rsi'], 30)) & # MODIFIED: Changed RSI condition to 'crossed_above 30' for reversal signal
            (dataframe['close'] > dataframe['ema50']) & 
            (dataframe['ema50'] > dataframe['ema200']) & 
            (dataframe['volume'] > dataframe['volume_ma'] * 0.8), # MODIFIED: Relaxed volume condition by lowering threshold to 80% of volume_ma
            'enter_long'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe['rsi'] > 60), # MODIFIED: Increased RSI exit threshold to 60 for higher profit taking
            'exit_long'] = 1
        return dataframe

    # ADDED: Note for backtesting environment strengthening (not directly in code, but important for strategy validation)
    # To strengthen backtest, use: --timerange 20200101-20231231 --data-format JSON
    # This helps in forward testing and validating robustness across different market conditions.
    # It is critical to run backtests with an extended timerange to properly evaluate strategy performance.