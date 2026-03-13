import numpy as np
import talib.abstract as ta
from pandas import DataFrame
from datetime import datetime
from freqtrade.persistence import Trade
from freqtrade.strategy import IStrategy, IntParameter, DecimalParameter

class vwma_v3(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = '1h'

    buy_rsi_max = IntParameter(30, 80, default=70, space="buy")
    buy_volume_factor = DecimalParameter(1.0, 2.5, default=2.28, space="buy")
    sell_sma200_threshold = DecimalParameter(0.95, 1.0, default=1.0, space="sell")

    minimal_roi = {
        "0": 0.5
    }

    stoploss = -0.212

    trailing_stop = False
    use_custom_stoploss = True
    
    position_adjustment_enable = True
    max_entry_position_adjustment = 1

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['sma_50'] = ta.SMA(dataframe, timeperiod=50)
        dataframe['sma_100'] = ta.SMA(dataframe, timeperiod=100)
        dataframe['sma_200'] = ta.SMA(dataframe, timeperiod=200)

        vwma_period = 100
        dataframe['vwma'] = (dataframe['close'] * dataframe['volume']).rolling(vwma_period).sum() / dataframe['volume'].rolling(vwma_period).sum()

        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        dataframe['volume_mean'] = dataframe['volume'].rolling(window=20).mean()

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        conditions = []
        conditions.append(
            (
                (dataframe['sma_50'] < dataframe['sma_100']) &
                (dataframe['sma_100'] < dataframe['sma_200']) &
                (dataframe['close'] > dataframe['sma_50']) &
                (dataframe['close'] > dataframe['vwma']) &
                (dataframe['volume'] > dataframe['volume_mean'] * self.buy_volume_factor.value) &
                (dataframe['rsi'] < 75)
            )
        )

        if conditions:
            dataframe.loc[
                np.logical_and.reduce(conditions),
                'enter_long'] = 1

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        return dataframe

    def custom_stoploss(self, pair: str, trade: 'Trade', current_time: datetime,
                        current_rate: float, current_profit: float, **kwargs) -> float:
        
        dataframe, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
        last_candle = dataframe.iloc[-1].squeeze()

        sma_200 = last_candle['sma_200']
        target_price = sma_200 * self.sell_sma200_threshold.value

        if current_rate > target_price:
            return 0.05
        
        return 1

    def adjust_trade_position(self, trade: Trade, current_time: datetime,
                              current_rate: float, current_profit: float,
                              min_stake: float | None, max_stake: float,
                              **kwargs) -> float | None:

        if current_profit > -0.07:
            return None

        if trade.nr_of_successful_entries == 1:
            return trade.stake_amount

        return None