from freqtrade.strategy import IStrategy
from freqtrade.strategy import IntParameter, DecimalParameter, BooleanParameter, CategoricalParameter
from pandas import DataFrame
import talib.abstract as ta
import freqtrade.vendor.qtpylib.indicators as qtpylib
import numpy as np

class NewStrategy_v15(IStrategy): # MODIFIED: Class name changed to NewStrategy_v15
    INTERFACE_VERSION = 3
    timeframe = '5m'
    
    minimal_roi = {
        "0": 0.03 # MODIFIED: Increased minimal_roi to 3% for better risk-reward ratio
    }
    stoploss = -0.02 # MODIFIED: Reduced stoploss to -2% for better risk-reward ratio

    # ADDED: Trailing stoploss to maximize profits and limit losses
    trailing_stop = True
    trailing_stop_positive = 0.01
    trailing_stop_positive_offset = 0.02
    trailing_only_offset_is_reached = True

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        # ADDED: Long-term SMA for trend filtering
        dataframe['sma_long'] = ta.SMA(dataframe, timeperiod=200)
        # ADDED: Short-term EMA for exit trend conditions
        dataframe['ema_short'] = ta.EMA(dataframe, timeperiod=20)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe['rsi'] < 30) & # Original RSI entry condition
            (dataframe['close'] > dataframe['sma_long']), # ADDED: Trend filter: only enter long if price is above the long-term SMA
            'enter_long'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe['rsi'] > 55) | # MODIFIED: Increased RSI exit threshold to 55 for better profit taking
                (qtpylib.crossed_below(dataframe['close'], dataframe['ema_short'])) # ADDED: Alternative exit condition: close crosses below a short-term EMA
            ),
            'exit_long'] = 1
        return dataframe