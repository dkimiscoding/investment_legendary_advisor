"""
데이터 수집 파이프라인
S&P500 + 주요 종목의 차트/재무/센티먼트 데이터 수집
"""

import os
import json
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional

# --- 유틸리티 ---

def calc_rsi(prices: pd.Series, period: int = 14) -> float:
    delta = prices.diff()
    gain = delta.where(delta > 0, 0).rolling(period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return round(rsi.iloc[-1], 2) if not pd.isna(rsi.iloc[-1]) else 50.0


def calc_ma(prices: pd.Series, period: int) -> float:
    return round(prices.rolling(period).mean().iloc[-1], 2)


def median(values: list) -> float:
    s = sorted([v for v in values if v is not None and not np.isnan(v)])
    if not s:
        return 0
    mid = len(s) // 2
    return s[mid] if len(s) % 2 else (s[mid-1] + s[mid]) / 2


# --- 차트 데이터 수집 ---

def collect_chart_data(ticker: str) -> dict:
    """차트 판독기용 데이터 수집"""
    stock = yf.Ticker(ticker)
    hist = stock.history(period="1y")
    
    if hist.empty:
        raise ValueError(f"No data for {ticker}")
    
    closes = hist['Close']
    latest = closes.iloc[-1]
    
    ma50 = calc_ma(closes, 50)
    ma200 = calc_ma(closes, 200) if len(closes) >= 200 else latest
    rsi = calc_rsi(closes)
    
    # 이격도
    deviation = round((latest - ma50) / ma50 * 100, 2)
    
    # 점수 계산
    # MA 점수
    if latest > ma200 and latest > ma50:
        ma_score = 5
    elif latest > ma50:
        ma_score = 3
    elif latest > ma200:
        ma_score = 2
    else:
        ma_score = 0
    
    # 이격도 점수
    if deviation <= -10: dev_score = 5
    elif deviation <= -5: dev_score = 4
    elif deviation <= 0: dev_score = 3
    elif deviation <= 5: dev_score = 2
    elif deviation <= 10: dev_score = 1
    else: dev_score = 0
    
    # RSI 점수
    if rsi < 30: rsi_score = 5
    elif rsi < 40: rsi_score = 4
    elif rsi < 50: rsi_score = 3
    elif rsi < 60: rsi_score = 2
    elif rsi < 70: rsi_score = 1
    else: rsi_score = 0
    
    # 패턴 점수 (간소화)
    recent = closes.tail(20).values
    trend = (recent[-1] - recent[0]) / recent[0]
    if trend < -0.05: pattern_score = 4
    elif trend > 0.05: pattern_score = 1
    else: pattern_score = 3
    
    total = ma_score + dev_score + rsi_score + pattern_score
    
    return {
        'ticker': ticker,
        'date': hist.index[-1].strftime('%Y-%m-%d'),
        'close': round(latest, 2),
        'ma50': ma50,
        'ma200': ma200,
        'rsi': rsi,
        'deviation': deviation,
        'scores': {
            'ma': ma_score,
            'deviation': dev_score,
            'rsi': rsi_score,
            'pattern': pattern_score,
            'total': total,
        }
    }


# --- 주가 판독기 데이터 ---

def collect_valuation_data(ticker: str) -> dict:
    """주가 판독기용 데이터 수집"""
    stock = yf.Ticker(ticker)
    info = stock.info
    
    current_price = info.get('currentPrice') or info.get('regularMarketPrice', 0)
    trailing_eps = info.get('trailingEps', 0)
    pe_ratio = info.get('trailingPE', 0)
    forward_pe = info.get('forwardPE', 0)
    
    # EPS 성장률 수집
    growth_rates = []
    eg = info.get('earningsGrowth')
    rg = info.get('revenueGrowth')
    if eg: growth_rates.append(eg * 100)
    if rg: growth_rates.append(rg * 100)
    
    # 애널리스트 추정 성장률
    eg_est = info.get('earningsQuarterlyGrowth')
    if eg_est: growth_rates.append(eg_est * 100)
    
    if not growth_rates:
        growth_rates = [10]  # 보수적 기본값
    
    # 소몽 공식
    median_growth = median(growth_rates)
    fair_per = max(median_growth, 5)  # 최소 PER 5
    estimated_eps = trailing_eps * (1 + growth_rates[0] / 100) if trailing_eps else 0
    fair_price = round(estimated_eps * fair_per, 2)
    upside = round((fair_price - current_price) / current_price * 100, 2) if current_price else 0
    peg = round(pe_ratio / median_growth, 2) if median_growth > 0 else 999
    
    # S&P500 PER
    spy = yf.Ticker('SPY')
    market_pe = spy.info.get('trailingPE', 22)
    
    return {
        'ticker': ticker,
        'current_price': current_price,
        'eps': trailing_eps,
        'estimated_eps': round(estimated_eps, 2),
        'pe_ratio': round(pe_ratio, 2) if pe_ratio else 0,
        'growth_rates': [round(g, 2) for g in growth_rates],
        'median_growth': round(median_growth, 2),
        'fair_per': round(fair_per, 2),
        'fair_price': fair_price,
        'upside_pct': upside,
        'peg': peg,
        'market_pe': round(market_pe, 2),
    }


# --- 센티먼트 데이터 ---

def collect_sentiment_data() -> dict:
    """역발상 판독기용 데이터 수집"""
    # VIX
    vix = yf.Ticker('^VIX')
    vix_val = vix.info.get('regularMarketPrice', 20)
    
    # VIX 점수
    if vix_val >= 35: vix_score = 5
    elif vix_val >= 30: vix_score = 4
    elif vix_val >= 25: vix_score = 3
    elif vix_val >= 20: vix_score = 2
    elif vix_val >= 15: vix_score = 1
    else: vix_score = 0
    
    return {
        'date': datetime.now().strftime('%Y-%m-%d'),
        'vix': round(vix_val, 2),
        'vix_score': vix_score,
        'put_call_ratio': 0.85,  # Phase 2: CBOE 연동
        'pc_score': 2,
        'aaii_bullish': 35,      # Phase 2: AAII 연동
        'aaii_bearish': 30,
        'aaii_score': 3,
        'margin_debt_yoy': 0,
        'margin_score': 3,
        'hy_spread': 3.5,
        'hy_score': 2,
    }


# --- TOP 20 생성 ---

SP500_SAMPLE = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B',
    'UNH', 'JNJ', 'V', 'XOM', 'JPM', 'PG', 'MA', 'HD', 'CVX', 'MRK',
    'ABBV', 'LLY', 'PEP', 'KO', 'COST', 'AVGO', 'WMT', 'MCD', 'CSCO',
    'ACN', 'TMO', 'ABT', 'CRM', 'DHR', 'NKE', 'TXN', 'NEE', 'PM',
    'UPS', 'RTX', 'LOW', 'INTC', 'AMD', 'QCOM', 'AMAT', 'ISRG', 'BKNG',
]


def generate_top20():
    """TOP 20 리스트 생성"""
    results = []
    sentiment = collect_sentiment_data()
    sent_total = sentiment['vix_score'] + sentiment['pc_score'] + sentiment['aaii_score'] + sentiment['margin_score'] + sentiment['hy_score']
    
    for ticker in SP500_SAMPLE:
        try:
            chart = collect_chart_data(ticker)
            val = collect_valuation_data(ticker)
            
            chart_score = chart['scores']['total']
            val_score = 0  # 간소화된 계산
            
            # PER 점수
            if val['pe_ratio'] > 0:
                ratio = val['pe_ratio'] / val['market_pe']
                if ratio < 0.5: val_score += 5
                elif ratio < 0.75: val_score += 4
                elif ratio < 1.0: val_score += 3
                elif ratio < 1.25: val_score += 2
                elif ratio < 1.5: val_score += 1
            
            # 적정주가 점수
            if val['upside_pct'] >= 50: val_score += 5
            elif val['upside_pct'] >= 30: val_score += 4
            elif val['upside_pct'] >= 10: val_score += 3
            elif val['upside_pct'] >= 0: val_score += 2
            elif val['upside_pct'] >= -15: val_score += 1
            
            # PEG 점수
            peg = val['peg']
            if 0 < peg < 0.5: val_score += 5
            elif peg < 0.75: val_score += 4
            elif peg < 1.0: val_score += 3
            elif peg < 1.5: val_score += 2
            elif peg < 2.0: val_score += 1
            
            total = chart_score + val_score + sent_total
            
            results.append({
                'ticker': ticker,
                'chart_score': chart_score,
                'valuation_score': val_score,
                'sentiment_score': sent_total,
                'total_score': total,
                'fair_price': val['fair_price'],
                'upside': val['upside_pct'],
            })
            
            print(f"✅ {ticker}: chart={chart_score}, val={val_score}, sent={sent_total}, total={total}")
            
        except Exception as e:
            print(f"❌ {ticker}: {e}")
    
    # 정렬 (총점 높은 순)
    results.sort(key=lambda x: x['total_score'], reverse=True)
    
    # Tier 분류
    for i, r in enumerate(results):
        if i < 7: r['tier'] = 1
        elif i < 14: r['tier'] = 2
        else: r['tier'] = 3
    
    return results[:20]


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Investment Advisor Data Collector')
    parser.add_argument('--mode', choices=['chart', 'valuation', 'sentiment', 'top20', 'single'],
                       default='single')
    parser.add_argument('--ticker', default='AAPL')
    args = parser.parse_args()
    
    if args.mode == 'chart':
        result = collect_chart_data(args.ticker)
        print(json.dumps(result, indent=2))
    
    elif args.mode == 'valuation':
        result = collect_valuation_data(args.ticker)
        print(json.dumps(result, indent=2))
    
    elif args.mode == 'sentiment':
        result = collect_sentiment_data()
        print(json.dumps(result, indent=2))
    
    elif args.mode == 'top20':
        results = generate_top20()
        print(json.dumps(results, indent=2))
        # 저장
        with open('top20_results.json', 'w') as f:
            json.dumps(results, f, indent=2)
        print(f"\n📊 TOP 20 saved to top20_results.json")
    
    elif args.mode == 'single':
        print(f"\n{'='*50}")
        print(f"📊 종합 분석: {args.ticker}")
        print(f"{'='*50}")
        
        chart = collect_chart_data(args.ticker)
        print(f"\n📈 차트 판독기: {chart['scores']['total']}/20")
        print(f"  MA: {chart['scores']['ma']}, 이격도: {chart['scores']['deviation']}, RSI: {chart['scores']['rsi']}, 패턴: {chart['scores']['pattern']}")
        print(f"  현재가: ${chart['close']}, MA50: ${chart['ma50']}, MA200: ${chart['ma200']}")
        print(f"  이격도: {chart['deviation']}%, RSI: {chart['rsi']}")
        
        val = collect_valuation_data(args.ticker)
        print(f"\n💰 주가 판독기:")
        print(f"  현재가: ${val['current_price']}, 적정주가: ${val['fair_price']}")
        print(f"  상승여력: {val['upside_pct']}%")
        print(f"  PER: {val['pe_ratio']}, PEG: {val['peg']}")
        print(f"  EPS 성장률 중앙값: {val['median_growth']}%, 적정PER: {val['fair_per']}")
        
        sent = collect_sentiment_data()
        sent_total = sent['vix_score'] + sent['pc_score'] + sent['aaii_score'] + sent['margin_score'] + sent['hy_score']
        print(f"\n🔄 역발상 판독기: {sent_total}/20")
        print(f"  VIX: {sent['vix']} (점수: {sent['vix_score']})")
