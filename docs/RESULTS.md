# Natiijooyinka & Darajooyinka (Results & Rankings)

Taageerada aragga natiijooyinka fasalka, darajooyinka (rank), isbarbardhigga imtixaanada, iyo daabacaadda/soo-dejinta.

- Meel: Tab-ka “Results” gudaha frontend-ka
- Ujeeddo: Inaad si degdeg ah u hesho darajooyinka ardayda iyo guud ahaan waxqabadka fasalka; soo bandhig Transcript; daabac ama CSV u dhoofso
- Cusbooneysiintan: 1 Oct 2025

## Shuruudaha ka hor
- Waa in horay loo abuuray: Academic Years, Grades, Shifts, iyo Grade Sections
- Imtixaanada iyo natiijooyinkooda waa inay jiraan si xogtu u soo baxdo

## Filterrada iyo Hababka (Modes)
Filterrada waxay ku kaydsamaan session-ka browser-ka (sessionStorage) si ay u sii jiraan inta aad tab-ka furan tahay.

- Academic Year → Grade → Shift → Section
  - Section waxaa furma marka saddexda hore la doorto
- Mode (Hab):
  - Subject: Soo saar darajooyin iyadoo lagu saleynayo hal Subject la doortay
  - Overall: Guud ahaan (100), isku darka dhammaan maaddooyinka
  - Exam Type: Ku saleysan nooca imtixaanka (tusaale Mid-term, Final)
  - Top N: Kaliya tus kuwa ugu sarreeya N
  - Bottom N: Kaliya tus kuwa ugu hooseeya N
  - Trend (Mid vs Final): Isbarbardhig mid-term vs final iyo Delta
  - Subject Difficulty: Celceliska maaddo walba + tirada ardayda

Habka doorashada ee xulashooyinka:
- Subject: muuqda marka Mode = Subject
- Exam Type: muuqda marka Mode = Exam Type
- Top/Bottom: geli N marka Mode = Top ama Bottom

## Warbixinta miiska (Table)
Marka xogtu timaado, waxa aad arki doontaa miis leh:
- Rank, Student
- Subject columns (hal ama dhowr saf-kan wuxuu ka yimaadaa server-ka)
- Total (100): isku darka natiijooyinka la xisaabiyay ilaa 100 guud ahaan
- Average: celceliska
- Row-ka hoose ee miiska: Class Average

Qoraallada muuqaalka gaarka ah:
- Trend mode: Kolumnada Mid-term, Final, iyo Delta; tfoot: Class Avg Delta
- Subject Difficulty: Safaf Subject, Avg, Students; tfoot: Class Avg (subjects)

## Ficillada (Actions)
- Export CSV
  - Ku shaqeeya marka aad joogto miiska caadiga ah (ma shaqeeyo Trend/Difficulty)
  - Ku dhoofinaya safafka iyo columns-ka muuqda ee miiska hadda
- Print
  - Daabac natiijooyinka iyadoo:
    - Banner-ka iskuulka uu ku jiro bogga sare ee daabacaadda (print-only header)
    - Faahfaahinta xulashooyinka (Academic Year, Grade, Shift, Section) ku qoran header-ka (marka bogga Results la daabacayo)
    - Footer-ka daabacaadda oo wata taariikh/saacad iyo Page X of Y
- View (saf kasta)
  - Fur Student Profile ee ardayga, iyadoo lagu gudbinayo Academic Year iyo Section-ka hadda si Transcript si toos ah u saxnaado
  - Badhamada “Back to Results” ayaa ku soo celinaya isla xaalada Results (waayo filterradu session-ka way ku jireen)
- Transcript (saf kasta)
  - Fura modal muujinaya Transcript-ka ardayga ee AY/Section-ka hadda
  - Jadwal leh Subject, Exam Types columns (Mid, Final… iwm), Total iyo Average (per subject iyo overall)
  - Modal-ka waxa uu leeyahay Print gudaha; daabacaaddu waxay leedahay banner header (print-only) oo nadiif ah

## Sida loo adeegsado (Tillaabooyin)
1) Dooro Academic Year → Grade → Shift → Section
2) Dooro Mode:
   - Haddii Subject: dooro Subject
   - Haddii Exam Type: dooro Exam Type
   - Haddii Top/Bottom: geli qiimaha N
3) Sug 1 ilbiriqsi (debounce 400ms) si xogta u soo laabato; Codsiyada hore waxaa la joojinayaa si looga fogaado labalaab
4) Adeegso ficillada:
   - Export CSV → soo dejiso file-ka
   - Print → daabac bogga
   - View → u guur Student Profile
   - Transcript → fur Transcript modal, ka dibna Print ama Close

## Waxqabad iyo Xasilooni
- Codsiyada xog-keenista waxaa lagu maamulaa AbortController si aanay isugu dul-minan marka filters si degdeg ah loo beddelo
- Debounce 400ms: yaree codsiyada badan marka aad si degdeg ah u gelinayso xulashooyin
- Exam Types waxaa lagu kaydiyaa xusuus kooban si aan loo soo celin codsi mar kasta
- Filters waxa lagu kaydiyaa sessionStorage (laguma bandhigo URL-ka)

## Xaddidaado iyo Fiiro Gaar ah
- Export CSV lama taageero marka Mode = Trend ama Subject Difficulty (maadaama naqshaddoodu ka duwan tahay miiska caadiga ah)
- Transcript waxa uu u baahan yahay inaad dooratay AY iyo Section
- Haddii miisku madhan yahay: hubi in imtixaanada la geliyey iyo in filters-ka sax yihiin

## Dhibaatooyinka Caamka ah (Troubleshooting)
- “Dooro Academic Year, Grade, Shift, Section”: Taasi waxay ka dhigan tahay in xulashooyinka asaasiga ah aan dhammaystirnayn
- “Dooro Subject/Exam Type”: Hababka qaarkood waxay u baahan yihiin doorasho dheeri ah
- “Natiijooyin lama helin”: Waxaa laga yaabaa in xog aan la gelin, ama filtarrada ay aad u xadidan yihiin (tusaale Top N aad u weyn ama Subject aan lahayn natiijo)
- Daabacaaddu ma muujiso banner: Hubi in browser-ku uu awood u leeyahay in uu daabaco sawirada/backgrounds (badanaa waa ON); halkan banner-ku waa img oo caadiyan wuu daabacmaa

## Erey-bixin
- Total (100): Nidaamku wuxuu u buuxiyaa 100 sida miisaan guud, iyadoo ku xiran habka aad dooratay (overall/exam type/subject)
- Average: Celceliska guud; footers waxa kale oo laga heli karaa Class Average
- Rank: Booska ardayga marka la barbar dhigo kuwa kale ee fasalka

## Xiriirro la xidhiidha
- Student Profile → Transcript iyo macluumaad kala duwan ee ardayga (badhamada View/Back to Results waxay fududeeyaan socdaalka)

---
Haddii aad rabto in aad ku darto sawirro (screenshots), geli `docs/DIAGRAMS.md` ama ku dar sawirada `docs/assets/` kadibna ku xiro halkan.
