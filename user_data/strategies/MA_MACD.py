# user_data/strategies/MyStrategy.py

import numpy as np
import talib.abstract as ta
from pandas import DataFrame
from freqtrade.strategy import IStrategy
import freqtrade.vendor.qtpylib.indicators as qtpylib

class MA_MACD(IStrategy):
    
    INTERFACE_VERSION = 3
    timeframe = '1h'
    minimal_roi = {
        "0": 0.20,
        "60": 0.10,   
        "240": 0.05, 
        "720": 0.03  
    }

    stoploss = -0.10

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        
        dataframe['ema_50'] = ta.EMA(dataframe, timeperiod=50)  
        dataframe['ema_200'] = ta.EMA(dataframe, timeperiod=200) 

        macd = ta.MACD(dataframe)
        dataframe['macd'] = macd['macd']
        dataframe['macdsignal'] = macd['macdsignal']

        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe['close'] > dataframe['ema_200']) &
                
                (qtpylib.crossed_above(dataframe['macd'], dataframe['macdsignal'])) &
                
                (dataframe['rsi'] < 70) &
                
                (dataframe['volume'] > 0) 
            ),
            'enter_long'] = 1

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (qtpylib.crossed_below(dataframe['macd'], dataframe['macdsignal']))
                |
                (dataframe['close'] < dataframe['ema_200'])
            ),
            'exit_long'] = 1
            
        return dataframe