# Translation guide: Hindi, Telugu and Urdu

PaisaPath teaches money skills to students about 16 to 19 years old, many of them in low-resource settings, in four
languages: English (`en`), Hindi (`hi`), Telugu (`te`) and Urdu (`ur`). Every English string in
`frontend/src/content/i18n/en/<namespace>.json` has a matching file in `hi/`, `te/` and `ur/`.

## What to produce

For a namespace, write `frontend/src/content/i18n/<lang>/<namespace>.json` with **exactly the same keys, in the same
order and the same nesting, as the English file**. Only the values change. Skip keys that begin with `_` (authoring
notes). Keys such as `"t1.title"` with a dot in the name stay exactly as written.

Then run `node tools/authoring/i18n-check.mjs <lang> <namespace> ...` from the repo root and fix every problem it lists
until it says `0 problems`.

## Hard rules (the checker enforces most of these)

1. **Never change a placeholder.** `{name}`, `{amount}`, `{total, rupees}`, `{n}` stay character for character, with
   the same spelling and spacing. They are code. You may move them to where the word order of your language needs them.
2. Keep `**bold**` marks, the same number of them, around the translation of the same words.
3. Keep numbers, `₹`, `%`, emoji and punctuation symbols as in English. **Always use Western digits (0 1 2 3)**, in Urdu
   as well. Keep the Indian digit grouping already in the source (₹1,25,000).
4. Plural keys (`...one` and `...other`) both need a translation.
5. Keep the English names for these in Latin letters, because the whole app uses them: `PaisaPath`, `UPI`, `PIN`, `OTP`,
   `KYC`, `EMI`, `SIP`, `FD`, `ETF`, `SMS`, `WhatsApp`, `Telegram`, `ATM`, `1930`.
6. Everything must be fictional and neutral: do not add real brand names, and do not turn a teaching sentence into advice
   to buy or sell anything. The app teaches how things work; it never says what to buy.
7. Output must be valid JSON in UTF-8.

## Voice

- Write the way a friendly older cousin or a good teacher speaks to a teenager: short sentences, everyday words, no
  textbook or government-office language. Keep each string about as long as the English (Telugu and Urdu may run a little
  longer; do not pad).
- Address the student as the respectful "you": Hindi `आप`, Telugu `మీరు`, Urdu `آپ`.
- Wrong answers are "not quite", never harsh or shaming. Keep the encouraging tone.
- Where English uses a common loan word that students really say (bank, account, loan, phone, app, mobile, SMS, UPI,
  online), prefer that word, written in your script, over a rare formal word.
- Character names stay recognisable: write them in your script (Asha, Ravi, Meena and so on are transliterated, not
  replaced by other names). Place and business names (Paisapur, shop and company names in the story) are transliterated
  the same way every time.

## Script and direction

- Hindi: Devanagari. Telugu: Telugu script. Urdu: Urdu (Nastaliq style, written in standard Arabic-script Unicode),
  right to left. Do not add direction marks; the app sets the direction for the whole page.
- In Urdu, keep Latin words and digits only where rule 3 or 5 says so.

## Glossary: use these words every time

| English | Hindi | Telugu | Urdu |
|---|---|---|---|
| bank | बैंक | బ్యాంక్ | بینک |
| bank account | बैंक खाता | బ్యాంక్ ఖాతా | بینک اکاؤنٹ |
| savings | बचत | పొదుపు | بچت |
| to save | बचाना | పొదుపు చేయడం | بچانا |
| interest | ब्याज | వడ్డీ | سود |
| simple interest | साधारण ब्याज | సాధారణ వడ్డీ | سادہ سود |
| compound interest | चक्रवृद्धि ब्याज | చక్రవడ్డీ | مرکب سود |
| loan | लोन | లోన్ | لون |
| debt | कर्ज़ | అప్పు | قرض |
| to borrow | उधार लेना | అప్పు తీసుకోవడం | قرض لینا |
| lender | उधार देने वाला | అప్పు ఇచ్చేవారు | قرض دینے والا |
| EMI / instalment | EMI / किस्त | EMI / వాయిదా | EMI / قسط |
| budget | बजट | బడ్జెట్ | بجٹ |
| income | आमदनी | ఆదాయం | آمدنی |
| expense / spending | खर्च | ఖర్చు | خرچ |
| need / want | ज़रूरत / चाहत | అవసరం / కోరిక | ضرورت / خواہش |
| goal | लक्ष्य | లక్ష్యం | ہدف |
| emergency fund | आपातकालीन फंड | అత్యవసర నిధి | ہنگامی فنڈ |
| invest / investment | निवेश करना / निवेश | పెట్టుబడి పెట్టడం / పెట్టుబడి | سرمایہ کاری کرنا / سرمایہ کاری |
| share / stock | शेयर | షేర్ | شیئر |
| bond | बॉन्ड | బాండ్ | بانڈ |
| mutual fund | म्यूचुअल फंड | మ్యూచువల్ ఫండ్ | میوچل فنڈ |
| gold | सोना | బంగారం | سونا |
| profit / loss | मुनाफ़ा / नुकसान | లాభం / నష్టం | منافع / نقصان |
| return (on money) | रिटर्न | రాబడి | منافع (ریٹرن) |
| risk | जोखिम | రిస్క్ | خطرہ |
| inflation | महँगाई | ధరల పెరుగుదల (ద్రవ్యోల్బణం) | مہنگائی |
| price | कीमत | ధర | قیمت |
| scam | धोखाधड़ी / स्कैम | మోసం / స్కామ్ | دھوکہ / اسکیم |
| fraud | धोखा | మోసం | فراڈ |
| password / PIN | पासवर्ड / PIN | పాస్‌వర్డ్ / PIN | پاس ورڈ / PIN |
| document | दस्तावेज़ | పత్రం | دستاویز |
| statement | स्टेटमेंट | స్టేట్‌మెంట్ | اسٹیٹمنٹ |
| balance | बैलेंस | బ్యాలెన్స్ | بیلنس |
| credit card | क्रेडिट कार्ड | క్రెడిట్ కార్డ్ | کریڈٹ کارڈ |
| credit score | क्रेडिट स्कोर | క్రెడిట్ స్కోర్ | کریڈٹ اسکور |
| nominee | नॉमिनी | నామినీ | نامزد (نومنی) |
| fee / charge | शुल्क | రుసుము | فیس |
| simulation | सिमुलेशन | సిమ్యులేషన్ | سمولیشن |
| round / task / level | राउंड / टास्क / लेवल | రౌండ్ / టాస్క్ / లెవల్ | راؤنڈ / ٹاسک / لیول |
| hint | संकेत | సూచన | اشارہ |
| points | अंक | పాయింట్లు | پوائنٹس |

If the glossary has no entry, choose the word a teenager would actually say and use it the same way throughout.

## Things that go wrong

- Translating a placeholder (`{total}` to `{कुल}`): breaks the app. Never.
- Dropping the second half of a long string, or adding advice that is not in English.
- Mixing scripts in one word. Latin words only where rule 5 allows.
- Gendered guesses: when the English has no gender, use wording that works for any student.
- Treating a button label like a sentence. Buttons stay short and in the imperative.
