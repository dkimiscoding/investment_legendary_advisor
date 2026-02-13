-- ============================================
-- 미국주식 투자자문봇 - Initial Schema
-- ============================================

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 주식 기본 정보
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 일별 차트 데이터
CREATE TABLE chart_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
  date DATE NOT NULL,
  close_price DECIMAL(12,2),
  ma_50 DECIMAL(12,2),
  ma_200 DECIMAL(12,2),
  rsi_14 DECIMAL(5,2),
  volume BIGINT,
  UNIQUE(ticker, date)
);

-- 판독기 점수
CREATE TABLE screener_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
  date DATE NOT NULL,
  
  -- 차트 판독기
  chart_ma_score SMALLINT CHECK (chart_ma_score BETWEEN 0 AND 5),
  chart_deviation_score SMALLINT CHECK (chart_deviation_score BETWEEN 0 AND 5),
  chart_rsi_score SMALLINT CHECK (chart_rsi_score BETWEEN 0 AND 5),
  chart_pattern_score SMALLINT CHECK (chart_pattern_score BETWEEN 0 AND 5),
  chart_total SMALLINT CHECK (chart_total BETWEEN 0 AND 20),
  
  -- 주가 판독기
  val_pe_score SMALLINT CHECK (val_pe_score BETWEEN 0 AND 5),
  val_fair_price_score SMALLINT CHECK (val_fair_price_score BETWEEN 0 AND 5),
  val_peg_score SMALLINT CHECK (val_peg_score BETWEEN 0 AND 5),
  val_market_pe_score SMALLINT CHECK (val_market_pe_score BETWEEN 0 AND 5),
  val_total SMALLINT CHECK (val_total BETWEEN 0 AND 20),
  
  -- 역발상 판독기
  sent_aaii_score SMALLINT CHECK (sent_aaii_score BETWEEN 0 AND 5),
  sent_pc_ratio_score SMALLINT CHECK (sent_pc_ratio_score BETWEEN 0 AND 5),
  sent_vix_score SMALLINT CHECK (sent_vix_score BETWEEN 0 AND 5),
  sent_margin_score SMALLINT CHECK (sent_margin_score BETWEEN 0 AND 5),
  sent_hy_score SMALLINT CHECK (sent_hy_score BETWEEN 0 AND 5),
  sent_total SMALLINT CHECK (sent_total BETWEEN 0 AND 20),
  
  -- 종합
  total_score SMALLINT CHECK (total_score BETWEEN 0 AND 60),
  signal VARCHAR(20) CHECK (signal IN ('strong_buy','buy','hold','sell','strong_sell')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticker, date)
);

-- 적정주가 계산
CREATE TABLE fair_price_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
  current_price DECIMAL(12,2),
  current_eps DECIMAL(12,2),
  estimated_eps DECIMAL(12,2),
  eps_growth_median DECIMAL(5,2),
  fair_per DECIMAL(5,2),
  fair_price DECIMAL(12,2),
  upside_pct DECIMAL(5,2),
  peg DECIMAL(5,2),
  calculation_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 시장 센티먼트 (일별)
CREATE TABLE market_sentiment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  vix DECIMAL(5,2),
  put_call_ratio DECIMAL(5,3),
  aaii_bullish DECIMAL(5,2),
  aaii_bearish DECIMAL(5,2),
  margin_debt_yoy DECIMAL(5,2),
  hy_spread DECIMAL(5,2),
  sp500_pe DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_chart_data_ticker_date ON chart_data(ticker, date DESC);
CREATE INDEX idx_screener_scores_ticker_date ON screener_scores(ticker, date DESC);
CREATE INDEX idx_screener_scores_total ON screener_scores(total_score DESC, date DESC);
CREATE INDEX idx_fair_price_ticker ON fair_price_calculations(ticker, calculation_date DESC);
