# Lumi & Hoya v0.1.16 交付與 Action Matrix

## 版本與本機測試

- 新版完整資料夾：C:/Users/joseph_chien/Documents/ChatGPT/Lumi_Hoya/generated/game-v0.1.16-dev-action-audio-visual-fix
- APP_VERSION = v0.1.16；進場顯示新版本，console 可讀 CatRoom.APP_VERSION。
- 新版本機：http://127.0.0.1:8767/；啟動指令：在新資料夾執行 node test/server.cjs。
- 原 v0.1.15 資料夾未修改。本輪另恢復 4173 本機服務，4173 仍是 v0.1.15。
- 尚未發布／上傳任何 repository。新埠 localStorage 與 4173 分開，不代表舊存檔被清除。

## 根因與修正

| 項目 | 根因 | 本輪修正 |
| --- | --- | --- |
| BGM | 基準仍是上一支音檔 | 原樣複製指定 WAV 為 bgm.wav，SHA-256 相同；Main 播放邏輯未動 |
| Danger | 實際程式是 0.18，不是 0.12 | 唯一重設音量處改為指定 0.084，狼／熊／狗及解除靜音共用 |
| 毛線球獎勵 | 與 Wand 共用 chase，Coins 原因文字和時機寫在三個分支，尚未玩滿8秒也可能給幣 | PLAY_WAND / PLAY_YARN 分類，>=8秒統一一次結算；共同20 Coins日上限 |
| 摸摸／一般餵食 | 原本只有舊 Mood／每日完整陪伴 Bond，沒有本次指定的每次有效 Bond | 有效摸摸里程碑與成功進食完成各 Bond+1，保留未要求刪除的 existing rule |
| 撥砂中斷 | 如廁完成 Need 歸零後，撥砂落到低優先流程，被玩具／睡眠／訪客搶走；pending 未保存 | 完整如廁／撥砂在非威脅訪客前完成；威脅／獎勵食物接管安全收尾；reload落地為一次mess |
| 撥砂判定 | 已有砂漬時短路，沒有每次都做random roll | 每次完整如廁皆抽樣，已有mess不重複扣分；正式機率0.25 |
| 清砂點擊 | 灑砂點擊區仍寫死舊Y，手機砂盆已向下移動 | 點擊區跟隨 world.litter 實際座標；滑鼠／touch鏟砂測試通過 |
| Lumi頭部閃爍 | 重現壁虎追看時 walk / watch-critter 在單一3px門檻高頻往返；兩個姿勢頭部位置不同 | 停下2px、重新追10px的遲滯距離，保留單一state／drawCat，不增加遮罩或z-index |
| Wolf前腳 | 原wolf圖只有胸身、缺少成對前肢 | 僅wolf分支增加左右前腿與犬形腳掌；bear/dog分支未改 |
| 本機不能玩 | 4173沒有listener，連線被拒 | 已重新啟動原版本本機服務，新版另跑8767 |

## Action Matrix

以下是請求量；實際結果都以 Stat clamp 後 delta 為準。正向滿分可為0；Coins可因每日上限、總額上限或條件不成立而為0。所有列 allowZero=true。
固定Action由 engine.js 的 ACTIONS / applyAction 共用；時間、衍生Clean、商品與威脅仍沿用具名規則表／函式，避免重寫不相關系統。

| Action ID／中文 | Category | Hunger | Mood | Energy | Bond | Clean | Water | Coins | Daily Cap／條件 | 標記 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PLAY_WAND／有效逗貓棒 | ACTIVE_INTERACTION | 0 | +1 | +1 | 0 | 0 | 0 | +2 | Pet/Wand/Yarn共用20/日；one per cat per effective session; shared 20 coins/day | 本輪確認 |
| PLAY_YARN／有效毛線球 | ACTIVE_INTERACTION | 0 | +1 | +1 | 0 | 0 | 0 | +2 | Pet/Wand/Yarn共用20/日；one per cat per effective session; shared 20 coins/day | 本輪確認 |
| PET_GENTLE_STROKE／有效摸摸里程碑 | ACTIVE_INTERACTION | 0 | +2 | 0 | +1 | 0 | 0 | 0 | two milestones per pet session | 本輪新增Bond；Mood為existing rule |
| PET_COINS／摸摸 Coins | ACTIVE_INTERACTION | 0 | 0 | 0 | 0 | 0 | 0 | +4 | Pet/Wand/Yarn共用20/日；effective stroke; >8s interval; shared 20 coins/day | existing rule |
| CAT_EAT_FOOD／一般餵食完成 | FEED | +2 / 3 食物單位 | +2 | 0 | +1 | 0 | 0 | 0 | one completion per meal | 本輪新增Bond；Mood為existing rule |
| DAILY_COMPANIONSHIP_REWARD／每天第一次完整陪伴 | DAILY | 0 | 0 | 0 | +2 | 0 | 0 | +10 | first completed companionship globally per local day | existing rule |
| DEFEND_CATS_SUCCESS／成功防衛的既有 Stat 獎勵 | EVENT | 0 | +2 | 0 | +2 | 0 | 0 | 0 | both cats once on successful wolf/bear defense | existing rule |
| WOLF_DEFENDED／趕走狼 | EVENT | 0 | 0 | 0 | 0 | 0 | 0 | +2 | once per successfully defended threat | existing rule |
| BEAR_DEFENDED／趕走熊 | EVENT | 0 | 0 | 0 | 0 | 0 | 0 | +2 | once per successfully defended threat | existing rule |
| DOG_FRIENDLY／摸摸狗狗五次 | EVENT | 0 | 0 | 0 | 0 | 0 | 0 | +2 | once after five friendly touches | existing rule |
| MOSQUITO_HIT／打蚊子 | EVENT | 0 | 0 | 0 | 0 | 0 | 0 | +2 | once per mosquito | existing rule |
| MOUSE_ASSISTED／協助趕老鼠 | EVENT | 0 | 0 | 0 | 0 | 0 | 0 | +2 | once per mouse | existing rule |
| ANT_HIT／點擊螞蟻 | EVENT | 0 | 0 | 0 | 0 | 0 | 0 | +2 | once per ant | existing rule |
| CAT_SOCIAL_COMPLETE／兩貓蹭蹭／踩奶完成 | CAT_AI | 0 | +4 | 0 | 0 | 0 | 0 | 0 | both cats after completed rub/knead | existing rule |
| PET_FAST_SWIPE／摸太快 | PLAYER_ACTION | 0 | -2 | 0 | 0 | 0 | 0 | 0 | per accepted action | existing rule |
| PET_SENSITIVE_AREA／摸敏感區 | PLAYER_ACTION | 0 | -2 | 0 | 0 | 0 | 0 | 0 | per accepted action | existing rule |
| SLEEP_INTERRUPT_THIRD／第三次以上吵醒 | PLAYER_ACTION | 0 | -2 | 0 | -2 | 0 | 0 | 0 | third and later sleep interruptions | existing rule |
| BIRD_WATCH_STARTLE／看鳥時嚇貓 | PLAYER_ACTION | 0 | -2 | 0 | 0 | 0 | 0 | 0 | once per perched visit | existing rule |
| NIGHT_LIGHT_FIRST_REWARD／當晚第一次晚安燈 | PLAYER_ACTION | 0 | +4 | 0 | 0 | 0 | 0 | 0 | both cats once per evening | existing rule |
| NIGHT_LIGHT_EARLY_REOPEN／十分鐘內重新開燈 | PLAYER_ACTION | 0 | -4 | 0 | 0 | 0 | 0 | 0 | both cats when reopened within ten minutes | existing rule |
| PLAY_EXERTION／玩累 | CAT_AI | -2 | 0 | 0 | 0 | 0 | 0 | 0 | after hidden play fatigue expires | existing rule |
| SEASONAL_BED_DAILY／季節睡墊休息 | CAT_AI | 0 | +2 | +2 | 0 | 0 | 0 | +6 | one per cat/day during purchased bed validity | existing rule |
| SEASONAL_BED_PAIR／兩貓都用過季節睡墊 | DAILY | 0 | 0 | 0 | 0 | 0 | 0 | +4 | both cats completed seasonal rest, once/day | existing rule |
| FULL_STAT_REWARD／分類首次滿值 | DAILY | 0 | 0 | 0 | 0 | 0 | 0 | +5 | each of six stat categories once/day; Bond needs intimate interaction | existing rule |
| REFILL_WATER／補水 | PLAYER_ACTION | 0 | 0 | 0 | 0 | 重算水量扣分 | 補至15 | 0 | per accepted action | existing rule |
| CAT_DRINK／喝水 | CAT_AI | 0 | 0 | 0 | 0 | 重算水量扣分 | -1 | 0 | per accepted action | existing rule |
| PLAYER_SCOOP_LITTER／鏟掉一坨 | PLAYER_ACTION | 0 | 0 | 0 | 0 | Poops減1後重算 | 0 | 0 | per accepted action | existing rule |
| CLEAN_MESS／清理物件 | PLAYER_ACTION | 0 | 0 | 0 | 0 | +2/+3（實際clamp） | 0 | 0 | per accepted action | existing rule |
| LITTER_COMPLETE／完整如廁 | CAT_AI | 0 | 0 | 0 | 0 | Poops增加後重算；溢砂另-3 | 0 | 0 | per accepted action | existing rule |
| ROOM_MESS／造成髒亂 | CAT_AI | 0 | 0 | 0 | 0 | -2/-3（實際clamp） | 0 | 0 | per accepted action | existing rule |
| THREAT_ARRIVAL／環境驚嚇 | ENV_EVENT | 0 | -2/-4/-6，見下表 | 0/-1/-2，見下表 | 0 | 0 | 0 | 0 | per accepted action | existing rule |
| AMBIENT_WATCH／純生活觀察／自主追逐 | ENV_EVENT | 0 | 0 | 0 | 0 | 0 | 0 | 0 | bird/butterfly/plane/meteor/gecko and autonomous mouse/ant chase | 本輪確認 |
| REWARD_FOOD／獎勵食物 | PLAYER_ACTION | 0 | +1/+2 | 0 | 0/+1 | 0 | 0 | -15/-30/-50 | per accepted action | existing rule |
| BUY_PAINTING／換畫 | PLAYER_ACTION | 0 | 0 | 0 | 0 | 0 | 0 | -5 | a different painting and sufficient balance | existing rule |
| BUY_SEASONAL_BED／購買季節睡墊 | PLAYER_ACTION | 0 | 0 | 0 | 0 | 0 | 0 | -100 | no active bed; seven day validity | existing rule |
| ELAPSED_TIME／線上／離線時間 | TIME_OFFLINE | 依時間，見下表 | 依時間，見下表 | 依睡醒狀態，見下表 | 0 | 隨水量／排便／髒亂推導 | 線上-1/30秒；離線-1/3小時 | 0 | per accepted action | existing rule |

## 衍生規則與既有獎勵（本輪不重新平衡）

- 當前版本每貓 Hunger/Mood/Energy 上限20、Bond上限10；Clean上限30、Water上限15。Overall是「目前選取貓的四項＋共用Clean」，不是雙貓相加；本輪依基準保留。
- PLAY_WAND／PLAY_YARN：每隻實際參與貓累積8秒有效近距離玩耍，一個session最多一次Mood+1/Energy+1/Coins+2；放開再開始／重新點毛線球建立新reward session，既有玩累與45秒休息照常。
- PET_GENTLE_STROKE：Lumi累積16、Hoya24移動距離為有效里程碑；每次近景最多2次。每次Mood+2為existing rule，Bond+1為本輪新增。PET_COINS仍是有效里程碑且距上次reward >8秒給4。
- 每日第一次完整陪伴額外Bond+2／Coins+10是existing rule，沒有擅自刪除。
- 一般吃飯每秒吃2單位，累積3單位Hunger+2；每實吃1單位ToiletNeed+1；該餐成功補Hunger才於結束給既有Mood+2及新增Bond+1。無額外餵食Coins。
- 狼／熊成功防衛既有DEFEND_CATS_SUCCESS：兩隻各Mood+2/Bond+2。這是基準已存在的Stat reward，按指令保留供Jo確認；本輪沒有額外替狼／熊／狗新增Stat。狗五次摸摸僅Coins+2，無防衛Stat。
- FULL_STAT_REWARD：六分類各每日第一次滿值Coins+5；Bond需要明確親密互動，其他Action可能另觸發此既有獎勵。
- SEASONAL_BED_DAILY：有效床上休息滿2秒，每貓每日Mood+2/Energy+2/Coins+6；兩貓都完成再Coins+4；睡眠Energy累積倍率1.25。
- Poops 0–8 → Clean基礎 30,26,22,18,14,10,6,2,0；再減 floor((15-Water)/3) 及各mess扣分，clamp 0–30。
- Mess扣分：plant3、curtain2、catTree3、lamp2、litter3、water2；最多同時5種，重複同一mess不重扣。清理移除該項，顯示真正恢復值。
- 自然大便Poops+1安靜重算；撥砂mess沿用MISCHIEF_LITTER feedback。鏟除每坨按Clean lookup重算。
- THREAT_ARRIVAL目前種類：THUNDER(-2Mood)、LOUD_NOISE(-2Mood)、DOG(-2Mood/-1Energy)、WOLF(-4Mood/-2Energy)、BEAR(-6Mood/-2Energy)。目前自然訪客只排程狼／熊／狗，選一隻貓受驚；其餘是既有可呼叫規則。
- REWARD_FOOD：fish Coins-15/Mood+1；can Coins-30/Mood+2；catnip Coins-50/Mood+2/Bond+1。40% Lumi、40% Hoya、20%兩貓；不屬於Active Coins cap。
- AMBIENT_WATCH含鳥／蝴蝶／飛機／流星／壁虎／貓自主追老鼠與螞蟻，直接Stat/Coins皆0；同期自然時間及其他已存在的動作仍正常計算。
- Hidden state如Anger、Sleepiness、ToiletNeed、play fatigue、cooldown保留；不直接寫Overall。

| 時間來源（existing rule） | 線上 | 離線 |
| --- | --- | --- |
| Hunger | 每120秒-2，最低0 | 每3600秒-2，被動保底8 |
| Mood | 每180秒-2，最低0 | 每5400秒-2，被動保底8 |
| Energy清醒 | 每240秒-2，最低0 | 每7200秒-2，被動保底8 |
| Energy睡眠 | 每20秒+2，上限20；季節床累積乘1.25 | 沿用同一睡眠桶及存檔睡眠狀態 |
| Water | 每30秒-1，最低0 | 每10800秒-1，被動保底6 |
| Bond | 不自然下降 | 不自然下降 |
| ToiletNeed | 每900秒+1；實吃每單位+1 | 累積到100可轉Poop，最多8 |
| 生理排程 | 每餐增poopQueue；30–120秒隨機排程；另每300秒8%自然需求 | 沿用排便queue推進；最多72小時elapsed |
| 離線髒亂 | 無此時間排程 | 每小時55%從未髒物件抽一個；最多5種、72次機會 |

以上保留基準既有的「poopQueue 30–120秒會清掉180秒delay」行為，以及線上／離線衰減不同；它們不屬於本輪要求的平衡修改，列出供下輪決策。

## 驗證

- test/results.tap：143項測試，143 PASS／0 FAIL／0 skipped。
- 100% DEBUG：5個完整cycle，正常如廁至少3秒→撥砂1.15秒→飛砂→mess→點擊清理→鏟poop→離開；5/5成功。真正drawCat執行驗證5顆粒子有移動、結束後消失。
- 正式0.25：0、0.2499、0.25、0.999邊界及已有mess的每次roll驗證；100次分層抽樣完整如廁實得25次spill（可重現演算法測試，不代表未控制的100次一定25次）。
- 中斷：未完成toilet／kick階段，威脅、獎勵食物、低Energy睡眠、Goodnight、wand、plane、reload皆驗證；不重複poop，不遺失pending mess。
- 姿勢：Lumi睡墊附近30秒、邊界往返、睡眠、wand喚醒、Reward Food及Threat；另8組能重現舊閃爍的seed各900秒，修正後快速切換0次。
- 輸入／觸覺：真實controller listeners測mouse與touch，擴展區鏟砂、實際poop減少、navigator.vibrate呼叫及iOS switch fallback保留。沒有新增畫面shake。
- 音訊：狼／熊／狗進出、mute/unmute後.084、Main回.3；既有unlock/purr/loop/haptics回歸。實際瀏覽器Main paused=false、loop=true、readyState=4、error=null，console沒有error。
- 指定BGM與新bgm.wav SHA-256：BE2725A9A33316EA819E1830CABE7A97C149900275BCD83AB9D1B37611FFEA83。

## 修改檔案

- engine.js：版本、Action mapping、行為獎勵、撥砂控制與保存、清理hitbox、壁虎追看遲滯。
- game.js：Danger音量、wolf前腿；音訊播放／mute／unlock及haptic函式未改。
- index.html：新版資源cache標記及新BGM cache標記。
- bgm.wav：指定檔案原樣複製。
- test/regressions.cjs、test/fountain.cjs：新驗證及舊測試固定RNG注入修正；基準有4個舊測試本來即失敗，未為此改遊戲平衡。
- test/server.cjs：獨立8767服務。test/scenes.html、test/visual.html：改用本版本資源，加入litter動畫檢視。
- test/results.tap、REVIEW-v0.1.16.md：結果及本報告。

## Jo實機確認

- iPhone實際觸覺強弱、Safari背景／前景音訊恢復，以及主BGM／Danger聽感需實機；測試通過不等於已驗證實體震動馬達。
- 請在8767確認無操作時Lumi仍有沒有你看到的另一種閃爍；本輪已修正可重現的高頻姿勢切換。
- 正式25%不保證每四次一定一次。
- 完整複製保留的舊ZIP檔仍是舊打包物；本輪交付以新資料夾中的實際檔案為準，沒有重新發布ZIP。
