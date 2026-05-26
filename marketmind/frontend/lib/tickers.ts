/**
 * Bundled ticker list — S&P 100 + Russell 1000 majors + thesis-sector companies.
 * Used for autocomplete in the portfolio holdings form. No external API needed.
 * Search matches on both ticker and company name (case-insensitive).
 */

export interface TickerEntry {
  ticker: string
  name: string
  sector?: string
}

export const TICKERS: TickerEntry[] = [
  // ── Mega cap tech ────────────────────────────────────────────────────────
  { ticker: 'AAPL',  name: 'Apple Inc.',                        sector: 'Technology' },
  { ticker: 'MSFT',  name: 'Microsoft Corporation',             sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A)',            sector: 'Technology' },
  { ticker: 'GOOG',  name: 'Alphabet Inc. (Class C)',            sector: 'Technology' },
  { ticker: 'AMZN',  name: 'Amazon.com Inc.',                   sector: 'Consumer' },
  { ticker: 'META',  name: 'Meta Platforms Inc.',                sector: 'Technology' },
  { ticker: 'TSLA',  name: 'Tesla Inc.',                         sector: 'Automotive' },
  { ticker: 'NVDA',  name: 'NVIDIA Corporation',                 sector: 'Semiconductors' },
  { ticker: 'AVGO',  name: 'Broadcom Inc.',                      sector: 'Semiconductors' },
  { ticker: 'ORCL',  name: 'Oracle Corporation',                 sector: 'Technology' },
  { ticker: 'CRM',   name: 'Salesforce Inc.',                    sector: 'Technology' },
  { ticker: 'ADBE',  name: 'Adobe Inc.',                         sector: 'Technology' },
  { ticker: 'NOW',   name: 'ServiceNow Inc.',                    sector: 'Technology' },
  { ticker: 'INTU',  name: 'Intuit Inc.',                        sector: 'Technology' },
  { ticker: 'IBM',   name: 'International Business Machines',    sector: 'Technology' },
  { ticker: 'CSCO',  name: 'Cisco Systems Inc.',                 sector: 'Technology' },
  { ticker: 'INTC',  name: 'Intel Corporation',                  sector: 'Semiconductors' },
  { ticker: 'QCOM',  name: 'Qualcomm Inc.',                      sector: 'Semiconductors' },
  { ticker: 'TXN',   name: 'Texas Instruments Inc.',             sector: 'Semiconductors' },
  { ticker: 'AMD',   name: 'Advanced Micro Devices Inc.',        sector: 'Semiconductors' },
  { ticker: 'MU',    name: 'Micron Technology Inc.',             sector: 'Semiconductors' },
  { ticker: 'ANET',  name: 'Arista Networks Inc.',               sector: 'Technology' },
  { ticker: 'DELL',  name: 'Dell Technologies Inc.',             sector: 'Technology' },
  { ticker: 'HPQ',   name: 'HP Inc.',                            sector: 'Technology' },
  { ticker: 'HPE',   name: 'Hewlett Packard Enterprise',         sector: 'Technology' },
  { ticker: 'PALO',  name: 'Palo Alto Networks Inc.',            sector: 'Technology' },
  { ticker: 'CRWD',  name: 'CrowdStrike Holdings Inc.',          sector: 'Technology' },
  { ticker: 'SNOW',  name: 'Snowflake Inc.',                     sector: 'Technology' },
  { ticker: 'PLTR',  name: 'Palantir Technologies Inc.',         sector: 'Technology' },
  { ticker: 'NET',   name: 'Cloudflare Inc.',                    sector: 'Technology' },
  { ticker: 'ZS',    name: 'Zscaler Inc.',                       sector: 'Technology' },
  { ticker: 'UBER',  name: 'Uber Technologies Inc.',             sector: 'Technology' },
  { ticker: 'LYFT',  name: 'Lyft Inc.',                          sector: 'Technology' },
  { ticker: 'ABNB',  name: 'Airbnb Inc.',                        sector: 'Consumer' },
  { ticker: 'SHOP',  name: 'Shopify Inc.',                       sector: 'Technology' },
  { ticker: 'COIN',  name: 'Coinbase Global Inc.',               sector: 'Finance' },
  { ticker: 'RBLX',  name: 'Roblox Corporation',                 sector: 'Technology' },
  { ticker: 'SNAP',  name: 'Snap Inc.',                          sector: 'Technology' },
  { ticker: 'PINS',  name: 'Pinterest Inc.',                     sector: 'Technology' },
  { ticker: 'SPOT',  name: 'Spotify Technology SA',              sector: 'Technology' },
  { ticker: 'NFLX',  name: 'Netflix Inc.',                       sector: 'Consumer' },
  { ticker: 'DIS',   name: 'Walt Disney Company',                sector: 'Consumer' },
  { ticker: 'CMCSA', name: 'Comcast Corporation',                sector: 'Communication' },
  { ticker: 'T',     name: 'AT&T Inc.',                          sector: 'Communication' },
  { ticker: 'VZ',    name: 'Verizon Communications Inc.',        sector: 'Communication' },
  { ticker: 'TMUS',  name: 'T-Mobile US Inc.',                   sector: 'Communication' },

  // ── AI Infrastructure / Data Center ─────────────────────────────────────
  { ticker: 'SMCI',  name: 'Super Micro Computer Inc.',          sector: 'AI Infrastructure' },
  { ticker: 'VRT',   name: 'Vertiv Holdings Co.',                sector: 'AI Infrastructure' },
  { ticker: 'MRVL',  name: 'Marvell Technology Inc.',            sector: 'AI Infrastructure' },
  { ticker: 'ARM',   name: 'Arm Holdings plc',                   sector: 'Semiconductors' },
  { ticker: 'ASML',  name: 'ASML Holding NV',                    sector: 'Semiconductors' },
  { ticker: 'TSM',   name: 'Taiwan Semiconductor Manufacturing', sector: 'Semiconductors' },
  { ticker: 'AMAT',  name: 'Applied Materials Inc.',             sector: 'Semiconductors' },
  { ticker: 'LRCX',  name: 'Lam Research Corporation',           sector: 'Semiconductors' },
  { ticker: 'KLAC',  name: 'KLA Corporation',                    sector: 'Semiconductors' },
  { ticker: 'MPWR',  name: 'Monolithic Power Systems Inc.',      sector: 'Semiconductors' },
  { ticker: 'ON',    name: 'ON Semiconductor Corporation',       sector: 'Semiconductors' },
  { ticker: 'MCHP',  name: 'Microchip Technology Inc.',          sector: 'Semiconductors' },
  { ticker: 'STM',   name: 'STMicroelectronics NV',              sector: 'Semiconductors' },
  { ticker: 'WOLF',  name: 'Wolfspeed Inc.',                     sector: 'Semiconductors' },
  { ticker: 'CLS',   name: 'Celestica Inc.',                     sector: 'AI Infrastructure' },
  { ticker: 'DLR',   name: 'Digital Realty Trust Inc.',          sector: 'Data Center' },
  { ticker: 'EQIX',  name: 'Equinix Inc.',                       sector: 'Data Center' },
  { ticker: 'IRM',   name: 'Iron Mountain Inc.',                  sector: 'Data Center' },
  { ticker: 'AMT',   name: 'American Tower Corporation',         sector: 'Infrastructure' },
  { ticker: 'CCI',   name: 'Crown Castle Inc.',                  sector: 'Infrastructure' },
  { ticker: 'SBAC',  name: 'SBA Communications Corporation',     sector: 'Infrastructure' },
  { ticker: 'IR',    name: 'Ingersoll Rand Inc.',                 sector: 'Data Center' },
  { ticker: 'JCI',   name: 'Johnson Controls International',     sector: 'Data Center' },
  { ticker: 'CARR',  name: 'Carrier Global Corporation',         sector: 'Data Center' },
  { ticker: 'TT',    name: 'Trane Technologies plc',             sector: 'Data Center' },

  // ── Energy Grid / Utilities ──────────────────────────────────────────────
  { ticker: 'ETN',   name: 'Eaton Corporation plc',              sector: 'Energy Grid' },
  { ticker: 'HUBB',  name: 'Hubbell Incorporated',               sector: 'Energy Grid' },
  { ticker: 'PWR',   name: 'Quanta Services Inc.',               sector: 'Energy Grid' },
  { ticker: 'AMPS',  name: 'Altus Power Inc.',                   sector: 'Energy Grid' },
  { ticker: 'POWL',  name: 'Powell Industries Inc.',             sector: 'Energy Grid' },
  { ticker: 'REZI',  name: 'Resideo Technologies Inc.',          sector: 'Energy Grid' },
  { ticker: 'GEV',   name: 'GE Vernova Inc.',                    sector: 'Energy Grid' },
  { ticker: 'NEE',   name: 'NextEra Energy Inc.',                sector: 'Energy Grid' },
  { ticker: 'DUK',   name: 'Duke Energy Corporation',            sector: 'Utilities' },
  { ticker: 'SO',    name: 'Southern Company',                   sector: 'Utilities' },
  { ticker: 'D',     name: 'Dominion Energy Inc.',               sector: 'Utilities' },
  { ticker: 'AEP',   name: 'American Electric Power',            sector: 'Utilities' },
  { ticker: 'EXC',   name: 'Exelon Corporation',                 sector: 'Utilities' },
  { ticker: 'XEL',   name: 'Xcel Energy Inc.',                   sector: 'Utilities' },
  { ticker: 'PCG',   name: 'PG&E Corporation',                   sector: 'Utilities' },
  { ticker: 'ED',    name: 'Consolidated Edison Inc.',           sector: 'Utilities' },
  { ticker: 'ES',    name: 'Eversource Energy',                  sector: 'Utilities' },
  { ticker: 'WEC',   name: 'WEC Energy Group Inc.',              sector: 'Utilities' },
  { ticker: 'AWK',   name: 'American Water Works Company',       sector: 'Utilities' },
  { ticker: 'BEP',   name: 'Brookfield Renewable Partners',      sector: 'Energy Grid' },
  { ticker: 'ENPH',  name: 'Enphase Energy Inc.',                sector: 'Energy Grid' },
  { ticker: 'SEDG',  name: 'SolarEdge Technologies Inc.',        sector: 'Energy Grid' },
  { ticker: 'RUN',   name: 'Sunrun Inc.',                        sector: 'Energy Grid' },
  { ticker: 'FSLR',  name: 'First Solar Inc.',                   sector: 'Energy Grid' },

  // ── Defense / Aerospace ─────────────────────────────────────────────────
  { ticker: 'LMT',   name: 'Lockheed Martin Corporation',        sector: 'Defense' },
  { ticker: 'RTX',   name: 'RTX Corporation',                    sector: 'Defense' },
  { ticker: 'NOC',   name: 'Northrop Grumman Corporation',       sector: 'Defense' },
  { ticker: 'GD',    name: 'General Dynamics Corporation',       sector: 'Defense' },
  { ticker: 'BA',    name: 'Boeing Company',                     sector: 'Defense' },
  { ticker: 'HII',   name: 'Huntington Ingalls Industries',      sector: 'Defense' },
  { ticker: 'L3H',   name: 'L3Harris Technologies Inc.',         sector: 'Defense' },
  { ticker: 'KTOS',  name: 'Kratos Defense & Security Solutions',sector: 'Defense' },
  { ticker: 'LDOS',  name: 'Leidos Holdings Inc.',               sector: 'Defense' },
  { ticker: 'SAIC',  name: 'Science Applications International', sector: 'Defense' },
  { ticker: 'CACI',  name: 'CACI International Inc.',            sector: 'Defense' },
  { ticker: 'BAH',   name: 'Booz Allen Hamilton Holding',        sector: 'Defense' },
  { ticker: 'TDG',   name: 'TransDigm Group Incorporated',       sector: 'Defense' },
  { ticker: 'HEI',   name: 'HEICO Corporation',                  sector: 'Defense' },
  { ticker: 'SPR',   name: 'Spirit AeroSystems Holdings',        sector: 'Defense' },
  { ticker: 'AXON',  name: 'Axon Enterprise Inc.',               sector: 'Defense' },

  // ── Financials ───────────────────────────────────────────────────────────
  { ticker: 'JPM',   name: 'JPMorgan Chase & Co.',               sector: 'Finance' },
  { ticker: 'BAC',   name: 'Bank of America Corporation',        sector: 'Finance' },
  { ticker: 'WFC',   name: 'Wells Fargo & Company',              sector: 'Finance' },
  { ticker: 'GS',    name: 'Goldman Sachs Group Inc.',           sector: 'Finance' },
  { ticker: 'MS',    name: 'Morgan Stanley',                     sector: 'Finance' },
  { ticker: 'C',     name: 'Citigroup Inc.',                     sector: 'Finance' },
  { ticker: 'BLK',   name: 'BlackRock Inc.',                     sector: 'Finance' },
  { ticker: 'BX',    name: 'Blackstone Inc.',                    sector: 'Finance' },
  { ticker: 'KKR',   name: 'KKR & Co. Inc.',                     sector: 'Finance' },
  { ticker: 'APO',   name: 'Apollo Global Management Inc.',      sector: 'Finance' },
  { ticker: 'V',     name: 'Visa Inc.',                          sector: 'Finance' },
  { ticker: 'MA',    name: 'Mastercard Incorporated',            sector: 'Finance' },
  { ticker: 'PYPL',  name: 'PayPal Holdings Inc.',               sector: 'Finance' },
  { ticker: 'AXP',   name: 'American Express Company',           sector: 'Finance' },
  { ticker: 'COF',   name: 'Capital One Financial Corporation',  sector: 'Finance' },
  { ticker: 'USB',   name: 'U.S. Bancorp',                       sector: 'Finance' },
  { ticker: 'PNC',   name: 'PNC Financial Services Group',       sector: 'Finance' },
  { ticker: 'SCHW',  name: 'Charles Schwab Corporation',         sector: 'Finance' },
  { ticker: 'SPGI',  name: 'S&P Global Inc.',                    sector: 'Finance' },
  { ticker: 'MCO',   name: 'Moody\'s Corporation',               sector: 'Finance' },
  { ticker: 'ICE',   name: 'Intercontinental Exchange Inc.',     sector: 'Finance' },
  { ticker: 'CME',   name: 'CME Group Inc.',                     sector: 'Finance' },

  // ── Healthcare ───────────────────────────────────────────────────────────
  { ticker: 'JNJ',   name: 'Johnson & Johnson',                  sector: 'Healthcare' },
  { ticker: 'UNH',   name: 'UnitedHealth Group Incorporated',    sector: 'Healthcare' },
  { ticker: 'LLY',   name: 'Eli Lilly and Company',              sector: 'Healthcare' },
  { ticker: 'ABT',   name: 'Abbott Laboratories',                sector: 'Healthcare' },
  { ticker: 'TMO',   name: 'Thermo Fisher Scientific Inc.',      sector: 'Healthcare' },
  { ticker: 'DHR',   name: 'Danaher Corporation',                sector: 'Healthcare' },
  { ticker: 'MDT',   name: 'Medtronic plc',                      sector: 'Healthcare' },
  { ticker: 'PFE',   name: 'Pfizer Inc.',                        sector: 'Healthcare' },
  { ticker: 'MRK',   name: 'Merck & Co. Inc.',                   sector: 'Healthcare' },
  { ticker: 'ABBV',  name: 'AbbVie Inc.',                        sector: 'Healthcare' },
  { ticker: 'BMY',   name: 'Bristol-Myers Squibb Company',       sector: 'Healthcare' },
  { ticker: 'AMGN',  name: 'Amgen Inc.',                         sector: 'Healthcare' },
  { ticker: 'GILD',  name: 'Gilead Sciences Inc.',               sector: 'Healthcare' },
  { ticker: 'BIIB',  name: 'Biogen Inc.',                        sector: 'Healthcare' },
  { ticker: 'ISRG',  name: 'Intuitive Surgical Inc.',            sector: 'Healthcare' },
  { ticker: 'SYK',   name: 'Stryker Corporation',                sector: 'Healthcare' },
  { ticker: 'BSX',   name: 'Boston Scientific Corporation',      sector: 'Healthcare' },
  { ticker: 'CVS',   name: 'CVS Health Corporation',             sector: 'Healthcare' },
  { ticker: 'CI',    name: 'Cigna Group',                        sector: 'Healthcare' },
  { ticker: 'HUM',   name: 'Humana Inc.',                        sector: 'Healthcare' },

  // ── Consumer / Retail ────────────────────────────────────────────────────
  { ticker: 'WMT',   name: 'Walmart Inc.',                       sector: 'Consumer' },
  { ticker: 'COST',  name: 'Costco Wholesale Corporation',       sector: 'Consumer' },
  { ticker: 'TGT',   name: 'Target Corporation',                 sector: 'Consumer' },
  { ticker: 'HD',    name: 'Home Depot Inc.',                    sector: 'Consumer' },
  { ticker: 'LOW',   name: 'Lowe\'s Companies Inc.',             sector: 'Consumer' },
  { ticker: 'NKE',   name: 'Nike Inc.',                          sector: 'Consumer' },
  { ticker: 'SBUX',  name: 'Starbucks Corporation',              sector: 'Consumer' },
  { ticker: 'MCD',   name: 'McDonald\'s Corporation',            sector: 'Consumer' },
  { ticker: 'YUM',   name: 'Yum! Brands Inc.',                   sector: 'Consumer' },
  { ticker: 'BKNG',  name: 'Booking Holdings Inc.',              sector: 'Consumer' },
  { ticker: 'MAR',   name: 'Marriott International Inc.',        sector: 'Consumer' },
  { ticker: 'HLT',   name: 'Hilton Worldwide Holdings Inc.',     sector: 'Consumer' },
  { ticker: 'GM',    name: 'General Motors Company',             sector: 'Automotive' },
  { ticker: 'F',     name: 'Ford Motor Company',                 sector: 'Automotive' },
  { ticker: 'RIVN',  name: 'Rivian Automotive Inc.',             sector: 'Automotive' },
  { ticker: 'LCID',  name: 'Lucid Group Inc.',                   sector: 'Automotive' },

  // ── Industrials / Conglomerates ──────────────────────────────────────────
  { ticker: 'GE',    name: 'GE Aerospace',                       sector: 'Industrials' },
  { ticker: 'HON',   name: 'Honeywell International Inc.',       sector: 'Industrials' },
  { ticker: 'MMM',   name: '3M Company',                         sector: 'Industrials' },
  { ticker: 'EMR',   name: 'Emerson Electric Co.',               sector: 'Industrials' },
  { ticker: 'ROK',   name: 'Rockwell Automation Inc.',           sector: 'Industrials' },
  { ticker: 'AME',   name: 'AMETEK Inc.',                        sector: 'Industrials' },
  { ticker: 'PH',    name: 'Parker-Hannifin Corporation',        sector: 'Industrials' },
  { ticker: 'ITW',   name: 'Illinois Tool Works Inc.',           sector: 'Industrials' },
  { ticker: 'DOV',   name: 'Dover Corporation',                  sector: 'Industrials' },
  { ticker: 'FTV',   name: 'Fortive Corporation',                sector: 'Industrials' },
  { ticker: 'XYL',   name: 'Xylem Inc.',                         sector: 'Industrials' },
  { ticker: 'GWW',   name: 'W.W. Grainger Inc.',                 sector: 'Industrials' },
  { ticker: 'FAST',  name: 'Fastenal Company',                   sector: 'Industrials' },
  { ticker: 'UPS',   name: 'United Parcel Service Inc.',         sector: 'Industrials' },
  { ticker: 'FDX',   name: 'FedEx Corporation',                  sector: 'Industrials' },
  { ticker: 'CAT',   name: 'Caterpillar Inc.',                   sector: 'Industrials' },
  { ticker: 'DE',    name: 'Deere & Company',                    sector: 'Industrials' },
  { ticker: 'URI',   name: 'United Rentals Inc.',                sector: 'Industrials' },

  // ── Materials / Energy ───────────────────────────────────────────────────
  { ticker: 'XOM',   name: 'Exxon Mobil Corporation',            sector: 'Energy' },
  { ticker: 'CVX',   name: 'Chevron Corporation',                sector: 'Energy' },
  { ticker: 'COP',   name: 'ConocoPhillips',                     sector: 'Energy' },
  { ticker: 'SLB',   name: 'Schlumberger Limited',               sector: 'Energy' },
  { ticker: 'OXY',   name: 'Occidental Petroleum Corporation',   sector: 'Energy' },
  { ticker: 'LIN',   name: 'Linde plc',                          sector: 'Materials' },
  { ticker: 'APD',   name: 'Air Products and Chemicals Inc.',    sector: 'Materials' },
  { ticker: 'NEM',   name: 'Newmont Corporation',                sector: 'Materials' },
  { ticker: 'FCX',   name: 'Freeport-McMoRan Inc.',              sector: 'Materials' },
  { ticker: 'NUE',   name: 'Nucor Corporation',                  sector: 'Materials' },
  { ticker: 'VMC',   name: 'Vulcan Materials Company',           sector: 'Materials' },
  { ticker: 'MLM',   name: 'Martin Marietta Materials Inc.',     sector: 'Materials' },

  // ── Real Estate ──────────────────────────────────────────────────────────
  { ticker: 'PLD',   name: 'Prologis Inc.',                      sector: 'Real Estate' },
  { ticker: 'PSA',   name: 'Public Storage',                     sector: 'Real Estate' },
  { ticker: 'O',     name: 'Realty Income Corporation',          sector: 'Real Estate' },
  { ticker: 'SPG',   name: 'Simon Property Group Inc.',          sector: 'Real Estate' },
  { ticker: 'WELL',  name: 'Welltower Inc.',                     sector: 'Real Estate' },
  { ticker: 'VICI',  name: 'VICI Properties Inc.',               sector: 'Real Estate' },

  // ── Misc notable ─────────────────────────────────────────────────────────
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc. (B)',        sector: 'Finance' },
  { ticker: 'BRK.A', name: 'Berkshire Hathaway Inc. (A)',        sector: 'Finance' },
  { ticker: 'SPXL',  name: 'Direxion Daily S&P 500 Bull 3X',    sector: 'ETF' },
  { ticker: 'QQQ',   name: 'Invesco QQQ Trust (Nasdaq-100)',     sector: 'ETF' },
  { ticker: 'SPY',   name: 'SPDR S&P 500 ETF Trust',             sector: 'ETF' },
  { ticker: 'VTI',   name: 'Vanguard Total Stock Market ETF',    sector: 'ETF' },
  { ticker: 'VOO',   name: 'Vanguard S&P 500 ETF',               sector: 'ETF' },
  { ticker: 'ARKK',  name: 'ARK Innovation ETF',                 sector: 'ETF' },
  { ticker: 'SOXX',  name: 'iShares Semiconductor ETF',          sector: 'ETF' },
  { ticker: 'TTD',   name: 'Trade Desk Inc.',                    sector: 'Technology' },
  { ticker: 'DDOG',  name: 'Datadog Inc.',                       sector: 'Technology' },
  { ticker: 'MDB',   name: 'MongoDB Inc.',                       sector: 'Technology' },
  { ticker: 'ESTC',  name: 'Elastic NV',                         sector: 'Technology' },
  { ticker: 'GTLB',  name: 'GitLab Inc.',                        sector: 'Technology' },
  { ticker: 'PATH',  name: 'UiPath Inc.',                        sector: 'Technology' },
  { ticker: 'AI',    name: 'C3.ai Inc.',                         sector: 'Technology' },
  { ticker: 'BBAI',  name: 'BigBear.ai Holdings Inc.',           sector: 'Technology' },
  { ticker: 'SOUN',  name: 'SoundHound AI Inc.',                 sector: 'Technology' },
  { ticker: 'GOOG',  name: 'Alphabet Inc. (Class C)',            sector: 'Technology' },

  // ── Canadian ETFs (TSX-listed) ───────────────────────────────────────────
  { ticker: 'VFV',   name: 'Vanguard S&P 500 Index ETF (CAD)',   sector: 'Canadian ETF' },
  { ticker: 'XEQT',  name: 'iShares Core Equity ETF Portfolio',  sector: 'Canadian ETF' },
  { ticker: 'VEQT',  name: 'Vanguard All-Equity ETF Portfolio',  sector: 'Canadian ETF' },
  { ticker: 'XGRO',  name: 'iShares Core Growth ETF Portfolio',  sector: 'Canadian ETF' },
  { ticker: 'VGRO',  name: 'Vanguard Growth ETF Portfolio',      sector: 'Canadian ETF' },
  { ticker: 'XIU',   name: 'iShares S&P/TSX 60 Index ETF',       sector: 'Canadian ETF' },
  { ticker: 'XIC',   name: 'iShares Core S&P/TSX Composite ETF', sector: 'Canadian ETF' },
  { ticker: 'ZSP',   name: 'BMO S&P 500 Index ETF (CAD)',        sector: 'Canadian ETF' },
  { ticker: 'XQQ',   name: 'iShares NASDAQ 100 Index ETF (CAD)', sector: 'Canadian ETF' },
  { ticker: 'ZNQ',   name: 'BMO NASDAQ 100 Equity Index ETF',    sector: 'Canadian ETF' },
  { ticker: 'HXT',   name: 'Horizons S&P/TSX 60 Index ETF',      sector: 'Canadian ETF' },
  { ticker: 'TEC',   name: 'TD Global Technology Leaders ETF',   sector: 'Canadian ETF' },
  { ticker: 'HGRO',  name: 'Horizons Growth TRI ETF Portfolio',  sector: 'Canadian ETF' },
  { ticker: 'ZBAL',  name: 'BMO Balanced ETF',                   sector: 'Canadian ETF' },
  { ticker: 'ZGRO',  name: 'BMO Growth ETF',                     sector: 'Canadian ETF' },

  // ── Canadian stocks (TSX) ────────────────────────────────────────────────
  { ticker: 'SHOP',  name: 'Shopify Inc.',                       sector: 'Technology' },
  { ticker: 'RY',    name: 'Royal Bank of Canada',               sector: 'Finance' },
  { ticker: 'TD',    name: 'Toronto-Dominion Bank',              sector: 'Finance' },
  { ticker: 'BNS',   name: 'Bank of Nova Scotia',                sector: 'Finance' },
  { ticker: 'BMO',   name: 'Bank of Montreal',                   sector: 'Finance' },
  { ticker: 'CM',    name: 'CIBC',                               sector: 'Finance' },
  { ticker: 'NA',    name: 'National Bank of Canada',            sector: 'Finance' },
  { ticker: 'MFC',   name: 'Manulife Financial Corporation',     sector: 'Finance' },
  { ticker: 'SLF',   name: 'Sun Life Financial Inc.',            sector: 'Finance' },
  { ticker: 'BAM',   name: 'Brookfield Asset Management Ltd.',   sector: 'Finance' },
  { ticker: 'BN',    name: 'Brookfield Corporation',             sector: 'Finance' },
  { ticker: 'POW',   name: 'Power Corporation of Canada',        sector: 'Finance' },
  { ticker: 'ENB',   name: 'Enbridge Inc.',                      sector: 'Energy' },
  { ticker: 'TRP',   name: 'TC Energy Corporation',              sector: 'Energy' },
  { ticker: 'CNQ',   name: 'Canadian Natural Resources Ltd.',    sector: 'Energy' },
  { ticker: 'SU',    name: 'Suncor Energy Inc.',                 sector: 'Energy' },
  { ticker: 'CVE',   name: 'Cenovus Energy Inc.',                sector: 'Energy' },
  { ticker: 'IMO',   name: 'Imperial Oil Ltd.',                  sector: 'Energy' },
  { ticker: 'CP',    name: 'Canadian Pacific Kansas City Ltd.',  sector: 'Industrials' },
  { ticker: 'CN',    name: 'Canadian National Railway Co.',      sector: 'Industrials' },
  { ticker: 'ATD',   name: 'Alimentation Couche-Tard Inc.',      sector: 'Consumer' },
  { ticker: 'L',     name: 'Loblaw Companies Ltd.',              sector: 'Consumer' },
  { ticker: 'MRU',   name: 'Metro Inc.',                         sector: 'Consumer' },
  { ticker: 'WN',    name: 'George Weston Ltd.',                 sector: 'Consumer' },
  { ticker: 'BCE',   name: 'BCE Inc.',                           sector: 'Telecom' },
  { ticker: 'T',     name: 'TELUS Corporation',                  sector: 'Telecom' },
  { ticker: 'TFII',  name: 'TFI International Inc.',             sector: 'Industrials' },
  { ticker: 'WSP',   name: 'WSP Global Inc.',                    sector: 'Industrials' },
  { ticker: 'STLC',  name: 'Stelco Holdings Inc.',               sector: 'Materials' },
  { ticker: 'ABX',   name: 'Barrick Gold Corporation',           sector: 'Materials' },
  { ticker: 'WPM',   name: 'Wheaton Precious Metals Corp.',      sector: 'Materials' },
  { ticker: 'AEM',   name: 'Agnico Eagle Mines Ltd.',            sector: 'Materials' },
  { ticker: 'FNV',   name: 'Franco-Nevada Corporation',          sector: 'Materials' },
  { ticker: 'K',     name: 'Kinross Gold Corporation',           sector: 'Materials' },
  { ticker: 'OTEX',  name: 'Open Text Corporation',              sector: 'Technology' },
  { ticker: 'BB',    name: 'BlackBerry Ltd.',                    sector: 'Technology' },
  { ticker: 'CSU',   name: 'Constellation Software Inc.',        sector: 'Technology' },
  { ticker: 'CAE',   name: 'CAE Inc.',                           sector: 'Defense' },
  { ticker: 'MDA',   name: 'MDA Space Ltd.',                     sector: 'Defense' },
  { ticker: 'IFC',   name: 'Intact Financial Corporation',       sector: 'Finance' },
  { ticker: 'EMA',   name: 'Emera Inc.',                         sector: 'Utilities' },
  { ticker: 'FTS',   name: 'Fortis Inc.',                        sector: 'Utilities' },
  { ticker: 'H',     name: 'Hydro One Ltd.',                     sector: 'Utilities' },
  { ticker: 'AQN',   name: 'Algonquin Power & Utilities Corp.',  sector: 'Utilities' },
  { ticker: 'NPI',   name: 'Northland Power Inc.',               sector: 'Utilities' },
  { ticker: 'BIP',   name: 'Brookfield Infrastructure Partners', sector: 'Utilities' },
  { ticker: 'BEP',   name: 'Brookfield Renewable Partners LP',   sector: 'Utilities' },
]

/**
 * Search tickers by query string — matches ticker prefix first,
 * then name substring. Returns up to maxResults entries.
 */
export function searchTickers(query: string, maxResults = 8): TickerEntry[] {
  if (!query || query.trim().length === 0) return []
  const q = query.trim().toUpperCase()
  const qLower = query.trim().toLowerCase()

  // Deduplicate by ticker
  const seen = new Set<string>()
  const unique = TICKERS.filter(t => {
    if (seen.has(t.ticker)) return false
    seen.add(t.ticker)
    return true
  })

  // Score each entry
  const scored = unique
    .map(t => {
      let score = 0
      if (t.ticker === q)                       score = 100  // exact ticker match
      else if (t.ticker.startsWith(q))          score = 80   // ticker prefix
      else if (t.ticker.includes(q))            score = 60   // ticker contains
      else if (t.name.toLowerCase().startsWith(qLower)) score = 50  // name prefix
      else if (t.name.toLowerCase().includes(qLower))   score = 30  // name contains
      return { ...t, score }
    })
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, maxResults)
}
