// What each marker is and common reasons it can be high or low, in plain language.
// Notes from the team's reference sheet (Gigi_Mock_Blood_Panels.xlsx, "Reference Ranges") are used
// where they exist. DRAFT: to be validated by GiGi's clinical advisers before launch.
// Shape: INFO[lang][code] = { what, high: [...], low: [...] }  (a list is left out when it doesn't apply)

const en = {
  fsh: {
    what: 'Follicle-stimulating hormone (FSH) is made by the pituitary gland in the brain. It tells the ovaries to grow follicles, the small sacs where eggs mature. Its level changes across the cycle, so GiGi reads it against your cycle phase.',
    high: ['A lower egg reserve, which happens naturally as you get closer to menopause', 'Perimenopause or menopause', 'Ovaries that stop working earlier than expected (premature ovarian insufficiency)', 'Being tested around ovulation, when FSH rises for a short time'],
    low: ['The combined contraceptive pill or other hormonal medicines', 'Breastfeeding', 'Low energy availability: intense exercise, low body weight or stress', 'A high prolactin level or, rarely, a problem with the pituitary gland'],
  },
  lh: {
    what: 'Luteinising hormone (LH) is made by the pituitary gland. A sharp rise in the middle of the cycle (the LH surge) triggers ovulation, the release of an egg. Its level changes across the cycle, so GiGi reads it against your cycle phase.',
    high: ['Being tested during the mid-cycle surge, which is normal and lasts 1–2 days', 'Polycystic ovary syndrome (PCOS), where LH is often high compared with FSH', 'Perimenopause or menopause', 'Premature ovarian insufficiency'],
    low: ['The combined contraceptive pill or other hormonal medicines', 'Breastfeeding', 'Low energy availability: intense exercise, low body weight or stress', 'A high prolactin level or, rarely, a problem with the pituitary gland'],
  },
  estradiol: {
    what: 'Estradiol is the main form of oestrogen. It is made mostly by the ovaries, builds the lining of the womb and matters for bones, heart, skin and mood. It peaks just before ovulation and changes across the cycle.',
    high: ['Being tested just before ovulation, when it peaks naturally', 'Treatments that contain oestrogen, such as fertility treatment or HRT', 'An ovarian cyst that makes hormones'],
    low: ['Perimenopause or menopause', 'The combined contraceptive pill', 'Breastfeeding', 'Low energy availability: intense exercise, low body weight or stress', 'Premature ovarian insufficiency'],
  },
  progesterone: {
    what: 'Progesterone is made by the ovary after ovulation and prepares the lining of the womb for a possible pregnancy. Measured about 7 days before your next period, a value above 3 ng/mL suggests that ovulation happened.',
    high: ['Being tested in the second half of the cycle, after ovulation — this is expected', 'Pregnancy', 'Progesterone medicines or fertility treatment'],
    low: ['Being tested too early or too late — it is best measured about 7 days before your next period', 'A cycle without ovulation, which can happen now and then to any woman', 'Conditions that disturb ovulation, such as PCOS or thyroid problems', 'The combined pill or menopause'],
  },
  amh: {
    what: 'Anti-Müllerian hormone (AMH) is made by the small follicles in the ovaries. It gives an idea of how many eggs are left (ovarian reserve) and falls naturally with age. It does not measure egg quality and cannot tell on its own whether you will get pregnant.',
    high: ['Polycystic ovary syndrome (PCOS), where the ovaries have many small follicles', 'Being younger — AMH is naturally higher in your twenties'],
    low: ['Natural decline with age', 'A lower ovarian reserve than usual for your age', 'Past ovarian surgery, endometriosis cysts or chemotherapy', 'The combined pill can lower AMH a little while you take it'],
  },
  prolactin: {
    what: 'Prolactin is made by the pituitary gland. Its main job is to make breast milk. Outside pregnancy and breastfeeding, a high level can stop ovulation and periods.',
    high: ['Pregnancy or breastfeeding — this is expected', 'Stress, poor sleep, exercise or breast stimulation shortly before the test', 'Some medicines, such as certain antidepressants, antipsychotics or anti-sickness drugs', 'An underactive thyroid', 'A small, usually benign growth in the pituitary gland (prolactinoma)'],
    low: ['A low value is rarely a concern on its own'],
  },
  testosterone: {
    what: 'Women make small amounts of testosterone in the ovaries and adrenal glands. It supports energy, muscle, bones and sex drive.',
    high: ['Polycystic ovary syndrome (PCOS), the most common cause', 'Adrenal gland conditions, such as non-classic congenital adrenal hyperplasia', 'Medicines or supplements that contain hormones', 'Rarely, a hormone-making growth in an ovary or adrenal gland'],
    low: ['The combined contraceptive pill', 'Natural decline with age and after menopause', 'Removal of the ovaries'],
  },
  shbg: {
    what: 'Sex hormone-binding globulin (SHBG) is a protein made by the liver that carries testosterone and oestrogen in the blood. The more SHBG, the less free (active) testosterone.',
    high: ['The combined contraceptive pill or oestrogen treatment', 'Pregnancy', 'An overactive thyroid', 'Low body weight'],
    low: ['Insulin resistance or higher body weight', 'Polycystic ovary syndrome (PCOS)', 'An underactive thyroid'],
  },
  dheas: {
    what: 'DHEA-S is a hormone made almost only by the adrenal glands. The body can turn it into testosterone and oestrogen. It declines naturally with age.',
    high: ['Polycystic ovary syndrome (PCOS)', 'Adrenal gland conditions, such as non-classic congenital adrenal hyperplasia', 'DHEA supplements', 'Rarely, a hormone-making growth in an adrenal gland'],
    low: ['Natural decline with age', 'Steroid medicines, such as prednisolone', 'Less often, adrenal glands that do not work well'],
  },
  tsh: {
    what: 'Thyroid-stimulating hormone (TSH) is the signal from the pituitary gland that tells the thyroid how hard to work. It is usually the first thyroid test: when the thyroid is slow TSH goes up, and when it is too active TSH goes down. If you are trying to conceive, many doctors aim for a TSH below 2.5.',
    high: ['An underactive thyroid (hypothyroidism), often from Hashimoto’s thyroiditis', 'A thyroid medicine dose that is too low', 'Recovery from a recent illness'],
    low: ['An overactive thyroid (hyperthyroidism), such as Graves’ disease', 'A thyroid medicine dose that is too high', 'Early pregnancy, when TSH can fall a little'],
  },
  free_t4: {
    what: 'Free T4 (thyroxine) is the main hormone made by the thyroid. “Free” means the active part that is not bound to proteins. It is read together with TSH.',
    high: ['An overactive thyroid (hyperthyroidism)', 'A thyroid medicine dose that is too high', 'Biotin supplements taken before the test can disturb some lab tests'],
    low: ['An underactive thyroid (hypothyroidism)', 'A thyroid medicine dose that is too low', 'Rarely, a problem with the pituitary gland'],
  },
  free_t3: {
    what: 'Free T3 is the most active thyroid hormone. The body makes most of it from T4. It is read together with TSH and free T4.',
    high: ['An overactive thyroid (hyperthyroidism)', 'Too much thyroid medicine'],
    low: ['An underactive thyroid', 'Eating too little for your activity level or very intense training', 'A recent illness'],
  },
  anti_tpo: {
    what: 'Anti-TPO antibodies attack an enzyme in the thyroid. A positive result means the immune system is reacting against the thyroid (autoimmune thyroid disease, usually Hashimoto’s). Many women with positive antibodies still have normal thyroid function, but it is worth following, especially before and during pregnancy.',
    high: ['Hashimoto’s thyroiditis', 'Graves’ disease', 'Sometimes positive in women whose thyroid works normally'],
  },
  glucose: {
    what: 'Fasting glucose is the sugar level in your blood after at least 8 hours without eating. It shows how well your body controls blood sugar. 100–125 mg/dL is the prediabetes range and 126 mg/dL or more is the diabetes range.',
    high: ['Not fasting before the test', 'Prediabetes or diabetes (a diagnosis needs a doctor and usually a second test)', 'Insulin resistance', 'Stress, illness or steroid medicines'],
    low: ['A long time without food or intense exercise before the test', 'Some diabetes medicines', 'If you have shaking, sweating or confusion, see a doctor'],
  },
  hba1c: {
    what: 'HbA1c shows your average blood sugar over the last 2–3 months. It does not need fasting. 5.7–6.4 % is the prediabetes range and 6.5 % or more is the diabetes range.',
    high: ['Prediabetes or diabetes (a diagnosis needs a doctor)', 'Iron-deficiency anaemia can raise HbA1c a little'],
    low: ['Conditions that shorten the life of red blood cells, or recent blood loss', 'A recent blood transfusion'],
  },
  insulin: {
    what: 'Insulin is the hormone that moves sugar from the blood into the cells. Fasting insulin shows how much your body needs to keep blood sugar normal. GiGi also uses it to calculate HOMA-IR, a measure of insulin resistance.',
    high: ['Insulin resistance, often linked to PCOS, higher body weight or low activity', 'Not fasting before the test', 'Prediabetes'],
    low: ['Usually not a concern when glucose is normal', 'With a high glucose, it can mean the body makes too little insulin — a doctor should check'],
  },
  chol_total: {
    what: 'Total cholesterol is all the cholesterol in your blood, the “good” (HDL) and the “bad” (LDL) together. It is read with LDL, HDL and triglycerides.',
    high: ['Diet, low activity and genetics', 'An underactive thyroid', 'Menopause, when cholesterol tends to rise', 'Inherited high cholesterol (familial hypercholesterolaemia)'],
    low: ['Usually not a concern', 'Sometimes an overactive thyroid or poor nutrition'],
  },
  ldl: {
    what: 'LDL is the “bad” cholesterol. Over the years, high LDL can build up in the arteries and raise the risk of heart disease and stroke.',
    high: ['A diet rich in saturated fat, low activity and genetics', 'An underactive thyroid', 'Menopause', 'Inherited high cholesterol (familial hypercholesterolaemia), especially when LDL is very high at a young age or heart disease runs in the family'],
  },
  hdl: {
    what: 'HDL is the “good” cholesterol. It helps carry extra cholesterol away from the arteries. For women, a value below 50 mg/dL is a risk marker.',
    low: ['Low activity, smoking or higher body weight', 'Insulin resistance, prediabetes or diabetes', 'Genetics'],
  },
  triglycerides: {
    what: 'Triglycerides are a type of fat in the blood that the body uses for energy. They rise after meals, so the test is done fasting.',
    high: ['Not fasting before the test', 'A diet high in sugar, refined carbohydrates or alcohol', 'Insulin resistance, prediabetes or diabetes', 'The combined pill or other oestrogen medicines can raise them a little', 'An underactive thyroid'],
    low: ['Usually not a concern'],
  },
  haemoglobin: {
    what: 'Haemoglobin is the protein in red blood cells that carries oxygen around the body. A low value is called anaemia and can cause tiredness, breathlessness and paleness.',
    high: ['Dehydration', 'Smoking or living at high altitude', 'Rarely, a bone marrow condition'],
    low: ['Iron deficiency, often from heavy periods or a diet low in iron', 'Low vitamin B12 or folate', 'Pregnancy', 'Blood loss or other conditions a doctor can check'],
  },
  mcv: {
    what: 'MCV (mean corpuscular volume) is the average size of your red blood cells. It helps find the cause of anaemia: small cells usually point to iron, large cells to vitamin B12 or folate.',
    high: ['Low vitamin B12 or folate', 'Alcohol', 'An underactive thyroid or some medicines'],
    low: ['Iron deficiency', 'Inherited conditions such as thalassaemia trait'],
  },
  wbc: {
    what: 'White blood cells fight infection. Their number rises when the body is fighting an infection or inflammation.',
    high: ['An infection, such as a urinary or chest infection', 'Inflammation, stress or intense exercise', 'Pregnancy or steroid medicines', 'Rarely, a blood condition — a doctor will usually repeat the test'],
    low: ['A recent viral infection', 'Some medicines', 'Autoimmune conditions', 'Rarely, a bone marrow problem — a doctor will usually repeat the test'],
  },
  platelets: {
    what: 'Platelets are small blood cells that help blood clot and stop bleeding.',
    high: ['Iron deficiency', 'Infection or inflammation', 'Recent blood loss', 'Rarely, a bone marrow condition'],
    low: ['A recent viral infection', 'Some medicines', 'Autoimmune conditions or liver problems', 'If you bruise or bleed easily, see a doctor soon'],
  },
  ferritin: {
    what: 'Ferritin shows how much iron your body has stored. Stores can run low before haemoglobin changes. A value between 15 and 30 ng/mL already suggests low iron stores, even inside the lab range.',
    high: ['Inflammation or infection — ferritin rises when the body is inflamed', 'Liver problems or alcohol', 'Too much iron, from supplements or an inherited condition (haemochromatosis)'],
    low: ['Heavy periods', 'A diet low in iron, for example vegetarian or vegan without supplements', 'Pregnancy or a recent birth', 'Poor absorption, such as coeliac disease'],
  },
  iron: {
    what: 'Serum iron is the amount of iron moving in your blood right now. It changes a lot during the day and with meals, so it is read together with ferritin.',
    high: ['Iron supplements or an iron-rich meal shortly before the test', 'Too much stored iron (haemochromatosis)', 'Liver problems'],
    low: ['Iron deficiency, often from heavy periods', 'Inflammation or infection', 'Pregnancy'],
  },
  vitamin_d: {
    what: 'Vitamin D helps the body absorb calcium and supports bones, muscles and immunity. The skin makes it with sunlight. 20–29 ng/mL is insufficient and below 20 ng/mL is deficient.',
    high: ['High-dose vitamin D supplements'],
    low: ['Little sun exposure, especially in winter', 'Darker skin or clothing that covers the skin', 'Higher body weight', 'Poor absorption, such as coeliac disease'],
  },
  b12: {
    what: 'Vitamin B12 is needed to make red blood cells and to keep nerves healthy. 200–300 pg/mL is borderline.',
    high: ['B12 supplements or injections', 'Rarely, liver or blood conditions'],
    low: ['A vegan or vegetarian diet without supplements', 'Poor absorption: pernicious anaemia, coeliac disease or stomach surgery', 'Some medicines, such as metformin or long-term stomach-acid medicines'],
  },
  folate: {
    what: 'Folate (vitamin B9) is needed to make new cells. Before and in early pregnancy it lowers the risk of neural tube defects in the baby, so anyone trying to conceive should take folic acid.',
    high: ['Folic acid supplements — usually not a concern'],
    low: ['A diet low in leafy greens, legumes and fortified foods', 'Alcohol', 'Poor absorption, such as coeliac disease', 'Some medicines, such as methotrexate or some epilepsy medicines'],
  },
  rubella_igg: {
    what: 'Rubella IgG shows whether you are protected against rubella (German measles), which can seriously harm a baby during pregnancy. 10 IU/mL or more means you are immune.',
    low: ['You were never vaccinated, or protection has faded. A doctor can offer the MMR vaccine; after it, avoid getting pregnant for 1 month.'],
  },
};

const pt = {
  fsh: {
    what: 'O hormônio folículo-estimulante (FSH) é produzido pela hipófise, no cérebro. Ele faz os ovários desenvolverem os folículos, as pequenas bolsas onde os óvulos amadurecem. O nível muda ao longo do ciclo, por isso o GiGi lê o FSH de acordo com a fase do seu ciclo.',
    high: ['Uma reserva de óvulos menor, o que acontece naturalmente perto da menopausa', 'Perimenopausa ou menopausa', 'Ovários que param de funcionar antes do esperado (insuficiência ovariana prematura)', 'Exame feito perto da ovulação, quando o FSH sobe por pouco tempo'],
    low: ['Pílula anticoncepcional combinada ou outros remédios hormonais', 'Amamentação', 'Pouca energia disponível: exercício intenso, peso baixo ou estresse', 'Prolactina alta ou, raramente, um problema na hipófise'],
  },
  lh: {
    what: 'O hormônio luteinizante (LH) é produzido pela hipófise. Uma subida forte no meio do ciclo (o pico de LH) provoca a ovulação, a liberação do óvulo. O nível muda ao longo do ciclo, por isso o GiGi lê o LH de acordo com a fase do seu ciclo.',
    high: ['Exame feito durante o pico do meio do ciclo, que é normal e dura 1–2 dias', 'Síndrome dos ovários policísticos (SOP), em que o LH costuma ficar alto em relação ao FSH', 'Perimenopausa ou menopausa', 'Insuficiência ovariana prematura'],
    low: ['Pílula anticoncepcional combinada ou outros remédios hormonais', 'Amamentação', 'Pouca energia disponível: exercício intenso, peso baixo ou estresse', 'Prolactina alta ou, raramente, um problema na hipófise'],
  },
  estradiol: {
    what: 'O estradiol é a principal forma de estrogênio. É produzido principalmente pelos ovários, prepara o revestimento do útero e é importante para ossos, coração, pele e humor. Chega ao ponto mais alto pouco antes da ovulação e muda ao longo do ciclo.',
    high: ['Exame feito pouco antes da ovulação, quando ele sobe naturalmente', 'Tratamentos com estrogênio, como tratamento de fertilidade ou reposição hormonal', 'Um cisto no ovário que produz hormônios'],
    low: ['Perimenopausa ou menopausa', 'Pílula anticoncepcional combinada', 'Amamentação', 'Pouca energia disponível: exercício intenso, peso baixo ou estresse', 'Insuficiência ovariana prematura'],
  },
  progesterone: {
    what: 'A progesterona é produzida pelo ovário depois da ovulação e prepara o revestimento do útero para uma possível gravidez. Medida cerca de 7 dias antes da próxima menstruação, um valor acima de 3 ng/mL sugere que houve ovulação.',
    high: ['Exame feito na segunda metade do ciclo, depois da ovulação — isso é esperado', 'Gravidez', 'Remédios com progesterona ou tratamento de fertilidade'],
    low: ['Exame feito cedo ou tarde demais — o melhor momento é cerca de 7 dias antes da próxima menstruação', 'Um ciclo sem ovulação, o que pode acontecer de vez em quando com qualquer mulher', 'Condições que atrapalham a ovulação, como SOP ou problemas de tireoide', 'Pílula combinada ou menopausa'],
  },
  amh: {
    what: 'O hormônio antimülleriano (AMH) é produzido pelos pequenos folículos dos ovários. Ele dá uma ideia de quantos óvulos ainda restam (reserva ovariana) e cai naturalmente com a idade. Não mede a qualidade dos óvulos e, sozinho, não diz se você vai engravidar.',
    high: ['Síndrome dos ovários policísticos (SOP), em que os ovários têm muitos folículos pequenos', 'Ser mais jovem — o AMH é naturalmente mais alto aos 20 e poucos anos'],
    low: ['Queda natural com a idade', 'Reserva ovariana menor do que o habitual para a sua idade', 'Cirurgia nos ovários, cistos de endometriose ou quimioterapia', 'A pílula combinada pode baixar um pouco o AMH enquanto você toma'],
  },
  prolactin: {
    what: 'A prolactina é produzida pela hipófise. Sua função principal é produzir o leite materno. Fora da gravidez e da amamentação, um nível alto pode interromper a ovulação e a menstruação.',
    high: ['Gravidez ou amamentação — isso é esperado', 'Estresse, sono ruim, exercício ou estímulo nas mamas pouco antes do exame', 'Alguns remédios, como certos antidepressivos, antipsicóticos ou remédios para enjoo', 'Tireoide lenta (hipotireoidismo)', 'Um pequeno tumor na hipófise, geralmente benigno (prolactinoma)'],
    low: ['Um valor baixo raramente é um problema sozinho'],
  },
  testosterone: {
    what: 'As mulheres produzem pequenas quantidades de testosterona nos ovários e nas glândulas suprarrenais. Ela ajuda na energia, nos músculos, nos ossos e na libido.',
    high: ['Síndrome dos ovários policísticos (SOP), a causa mais comum', 'Problemas nas suprarrenais, como hiperplasia adrenal congênita não clássica', 'Remédios ou suplementos com hormônios', 'Raramente, um tumor que produz hormônios no ovário ou na suprarrenal'],
    low: ['Pílula anticoncepcional combinada', 'Queda natural com a idade e depois da menopausa', 'Retirada dos ovários'],
  },
  shbg: {
    what: 'A SHBG (globulina ligadora de hormônios sexuais) é uma proteína produzida pelo fígado que transporta testosterona e estrogênio no sangue. Quanto mais SHBG, menos testosterona livre (ativa).',
    high: ['Pílula anticoncepcional combinada ou tratamento com estrogênio', 'Gravidez', 'Tireoide acelerada (hipertireoidismo)', 'Peso baixo'],
    low: ['Resistência à insulina ou peso mais alto', 'Síndrome dos ovários policísticos (SOP)', 'Tireoide lenta (hipotireoidismo)'],
  },
  dheas: {
    what: 'O DHEA-S é um hormônio produzido quase só pelas glândulas suprarrenais. O corpo pode transformá-lo em testosterona e estrogênio. Ele cai naturalmente com a idade.',
    high: ['Síndrome dos ovários policísticos (SOP)', 'Problemas nas suprarrenais, como hiperplasia adrenal congênita não clássica', 'Suplementos de DHEA', 'Raramente, um tumor na suprarrenal que produz hormônios'],
    low: ['Queda natural com a idade', 'Remédios à base de corticoide, como prednisona', 'Menos comum: suprarrenais que não funcionam bem'],
  },
  tsh: {
    what: 'O TSH (hormônio estimulante da tireoide) é o sinal da hipófise que diz à tireoide o quanto trabalhar. Costuma ser o primeiro exame da tireoide: quando ela está lenta, o TSH sobe; quando está acelerada, o TSH desce. Para quem está tentando engravidar, muitos médicos buscam um TSH abaixo de 2,5.',
    high: ['Tireoide lenta (hipotireoidismo), muitas vezes por tireoidite de Hashimoto', 'Dose baixa demais do remédio para a tireoide', 'Recuperação de uma doença recente'],
    low: ['Tireoide acelerada (hipertireoidismo), como a doença de Graves', 'Dose alta demais do remédio para a tireoide', 'Início da gravidez, quando o TSH pode cair um pouco'],
  },
  free_t4: {
    what: 'O T4 livre (tiroxina) é o principal hormônio produzido pela tireoide. “Livre” é a parte ativa, que não está presa a proteínas. É lido junto com o TSH.',
    high: ['Tireoide acelerada (hipertireoidismo)', 'Dose alta demais do remédio para a tireoide', 'Suplementos de biotina tomados antes do exame podem atrapalhar alguns exames'],
    low: ['Tireoide lenta (hipotireoidismo)', 'Dose baixa demais do remédio para a tireoide', 'Raramente, um problema na hipófise'],
  },
  free_t3: {
    what: 'O T3 livre é o hormônio da tireoide mais ativo. O corpo produz a maior parte dele a partir do T4. É lido junto com o TSH e o T4 livre.',
    high: ['Tireoide acelerada (hipertireoidismo)', 'Remédio para a tireoide em excesso'],
    low: ['Tireoide lenta', 'Comer pouco para o seu nível de atividade ou treinos muito intensos', 'Uma doença recente'],
  },
  anti_tpo: {
    what: 'Os anticorpos anti-TPO atacam uma enzima da tireoide. Um resultado positivo mostra que o sistema imune está reagindo contra a tireoide (doença autoimune da tireoide, geralmente Hashimoto). Muitas mulheres com anticorpos positivos têm a tireoide funcionando bem, mas vale acompanhar, principalmente antes e durante a gravidez.',
    high: ['Tireoidite de Hashimoto', 'Doença de Graves', 'Às vezes é positivo em mulheres com a tireoide funcionando normalmente'],
  },
  glucose: {
    what: 'A glicemia em jejum é o nível de açúcar no sangue depois de pelo menos 8 horas sem comer. Mostra como o corpo controla o açúcar no sangue. De 100 a 125 mg/dL é a faixa de pré-diabetes e 126 mg/dL ou mais é a faixa de diabetes.',
    high: ['Não estar em jejum no exame', 'Pré-diabetes ou diabetes (o diagnóstico é do médico e costuma precisar de um segundo exame)', 'Resistência à insulina', 'Estresse, doença ou remédios à base de corticoide'],
    low: ['Muito tempo sem comer ou exercício intenso antes do exame', 'Alguns remédios para diabetes', 'Se tiver tremor, suor ou confusão, procure um médico'],
  },
  hba1c: {
    what: 'A HbA1c (hemoglobina glicada) mostra a média do açúcar no sangue nos últimos 2–3 meses. Não precisa de jejum. De 5,7 a 6,4 % é a faixa de pré-diabetes e 6,5 % ou mais é a faixa de diabetes.',
    high: ['Pré-diabetes ou diabetes (o diagnóstico é do médico)', 'A anemia por falta de ferro pode subir um pouco a HbA1c'],
    low: ['Condições que encurtam a vida dos glóbulos vermelhos, ou perda de sangue recente', 'Transfusão de sangue recente'],
  },
  insulin: {
    what: 'A insulina é o hormônio que leva o açúcar do sangue para dentro das células. A insulina em jejum mostra quanto o corpo precisa para manter o açúcar normal. O GiGi também a usa para calcular o HOMA-IR, uma medida de resistência à insulina.',
    high: ['Resistência à insulina, muitas vezes ligada à SOP, ao peso mais alto ou ao sedentarismo', 'Não estar em jejum no exame', 'Pré-diabetes'],
    low: ['Geralmente não é um problema quando a glicemia está normal', 'Com a glicemia alta, pode indicar que o corpo produz pouca insulina — um médico deve avaliar'],
  },
  chol_total: {
    what: 'O colesterol total é todo o colesterol do sangue, o “bom” (HDL) e o “ruim” (LDL) juntos. É lido junto com LDL, HDL e triglicerídeos.',
    high: ['Alimentação, sedentarismo e genética', 'Tireoide lenta (hipotireoidismo)', 'Menopausa, quando o colesterol tende a subir', 'Colesterol alto hereditário (hipercolesterolemia familiar)'],
    low: ['Geralmente não é um problema', 'Às vezes, tireoide acelerada ou má alimentação'],
  },
  ldl: {
    what: 'O LDL é o colesterol “ruim”. Com os anos, um LDL alto pode se acumular nas artérias e aumentar o risco de doenças do coração e AVC.',
    high: ['Alimentação rica em gordura saturada, sedentarismo e genética', 'Tireoide lenta (hipotireoidismo)', 'Menopausa', 'Colesterol alto hereditário (hipercolesterolemia familiar), principalmente quando o LDL é muito alto em idade jovem ou há doença do coração na família'],
  },
  hdl: {
    what: 'O HDL é o colesterol “bom”. Ele ajuda a tirar o excesso de colesterol das artérias. Para mulheres, um valor abaixo de 50 mg/dL é um sinal de risco.',
    low: ['Sedentarismo, cigarro ou peso mais alto', 'Resistência à insulina, pré-diabetes ou diabetes', 'Genética'],
  },
  triglycerides: {
    what: 'Os triglicerídeos são um tipo de gordura no sangue que o corpo usa como energia. Sobem depois das refeições, por isso o exame é feito em jejum.',
    high: ['Não estar em jejum no exame', 'Alimentação com muito açúcar, carboidratos refinados ou álcool', 'Resistência à insulina, pré-diabetes ou diabetes', 'A pílula combinada ou outros remédios com estrogênio podem subir um pouco', 'Tireoide lenta (hipotireoidismo)'],
    low: ['Geralmente não é um problema'],
  },
  haemoglobin: {
    what: 'A hemoglobina é a proteína dos glóbulos vermelhos que leva oxigênio pelo corpo. Um valor baixo se chama anemia e pode causar cansaço, falta de ar e palidez.',
    high: ['Desidratação', 'Cigarro ou morar em lugar de altitude', 'Raramente, uma doença da medula óssea'],
    low: ['Falta de ferro, muitas vezes por menstruação intensa ou alimentação pobre em ferro', 'Falta de vitamina B12 ou de folato', 'Gravidez', 'Perda de sangue ou outras condições que um médico pode investigar'],
  },
  mcv: {
    what: 'O VCM (volume corpuscular médio) é o tamanho médio dos seus glóbulos vermelhos. Ajuda a achar a causa de uma anemia: células pequenas costumam indicar falta de ferro; células grandes, falta de vitamina B12 ou folato.',
    high: ['Falta de vitamina B12 ou de folato', 'Álcool', 'Tireoide lenta ou alguns remédios'],
    low: ['Falta de ferro', 'Condições hereditárias, como traço talassêmico'],
  },
  wbc: {
    what: 'Os glóbulos brancos (leucócitos) combatem infecções. O número sobe quando o corpo está lutando contra uma infecção ou inflamação.',
    high: ['Uma infecção, como infecção urinária ou respiratória', 'Inflamação, estresse ou exercício intenso', 'Gravidez ou remédios à base de corticoide', 'Raramente, uma doença do sangue — o médico costuma repetir o exame'],
    low: ['Uma infecção viral recente', 'Alguns remédios', 'Doenças autoimunes', 'Raramente, um problema na medula óssea — o médico costuma repetir o exame'],
  },
  platelets: {
    what: 'As plaquetas são pequenas células do sangue que ajudam na coagulação e a parar sangramentos.',
    high: ['Falta de ferro', 'Infecção ou inflamação', 'Perda de sangue recente', 'Raramente, uma doença da medula óssea'],
    low: ['Uma infecção viral recente', 'Alguns remédios', 'Doenças autoimunes ou problemas no fígado', 'Se você tiver manchas roxas ou sangramentos com facilidade, procure um médico logo'],
  },
  ferritin: {
    what: 'A ferritina mostra quanto ferro o seu corpo tem guardado. O estoque pode ficar baixo antes de a hemoglobina mudar. Um valor entre 15 e 30 ng/mL já sugere estoque de ferro baixo, mesmo dentro da faixa do laboratório.',
    high: ['Inflamação ou infecção — a ferritina sobe quando o corpo está inflamado', 'Problemas no fígado ou álcool', 'Excesso de ferro, por suplementos ou por uma condição hereditária (hemocromatose)'],
    low: ['Menstruação intensa', 'Alimentação pobre em ferro, por exemplo vegetariana ou vegana sem suplemento', 'Gravidez ou parto recente', 'Má absorção, como na doença celíaca'],
  },
  iron: {
    what: 'O ferro sérico é a quantidade de ferro circulando no sangue naquele momento. Ele muda muito ao longo do dia e com as refeições, por isso é lido junto com a ferritina.',
    high: ['Suplemento de ferro ou refeição rica em ferro pouco antes do exame', 'Excesso de ferro guardado no corpo (hemocromatose)', 'Problemas no fígado'],
    low: ['Falta de ferro, muitas vezes por menstruação intensa', 'Inflamação ou infecção', 'Gravidez'],
  },
  vitamin_d: {
    what: 'A vitamina D ajuda o corpo a absorver cálcio e é importante para ossos, músculos e imunidade. A pele a produz com a luz do sol. De 20 a 29 ng/mL é insuficiente e abaixo de 20 ng/mL é deficiência.',
    high: ['Suplementos de vitamina D em dose alta'],
    low: ['Pouca exposição ao sol, principalmente no inverno', 'Pele mais escura ou roupas que cobrem a pele', 'Peso mais alto', 'Má absorção, como na doença celíaca'],
  },
  b12: {
    what: 'A vitamina B12 é necessária para produzir glóbulos vermelhos e manter os nervos saudáveis. De 200 a 300 pg/mL é limítrofe.',
    high: ['Suplementos ou injeções de B12', 'Raramente, doenças do fígado ou do sangue'],
    low: ['Alimentação vegana ou vegetariana sem suplemento', 'Má absorção: anemia perniciosa, doença celíaca ou cirurgia no estômago', 'Alguns remédios, como metformina ou remédios para acidez usados por muito tempo'],
  },
  folate: {
    what: 'O folato (vitamina B9) é necessário para formar novas células. Antes e no início da gravidez, ele diminui o risco de defeitos do tubo neural no bebê, por isso quem está tentando engravidar deve tomar ácido fólico.',
    high: ['Suplementos de ácido fólico — geralmente não é um problema'],
    low: ['Alimentação pobre em folhas verdes, leguminosas e alimentos enriquecidos', 'Álcool', 'Má absorção, como na doença celíaca', 'Alguns remédios, como metotrexato ou alguns remédios para epilepsia'],
  },
  rubella_igg: {
    what: 'A rubéola IgG mostra se você está protegida contra a rubéola, que pode prejudicar seriamente o bebê durante a gravidez. 10 UI/mL ou mais significa que você está imune.',
    low: ['Você nunca foi vacinada ou a proteção diminuiu. Um médico pode indicar a vacina tríplice viral; depois dela, evite engravidar por 1 mês.'],
  },
};

const es = {
  fsh: {
    what: 'La hormona foliculoestimulante (FSH) la produce la hipófisis, en el cerebro. Hace que los ovarios desarrollen los folículos, las pequeñas bolsas donde maduran los óvulos. Su nivel cambia a lo largo del ciclo, por eso GiGi la lee según la fase de tu ciclo.',
    high: ['Una reserva de óvulos menor, algo que pasa de forma natural al acercarse la menopausia', 'Perimenopausia o menopausia', 'Ovarios que dejan de funcionar antes de lo esperado (insuficiencia ovárica prematura)', 'Análisis hecho cerca de la ovulación, cuando la FSH sube por poco tiempo'],
    low: ['La píldora anticonceptiva combinada u otros medicamentos hormonales', 'La lactancia', 'Poca energía disponible: ejercicio intenso, peso bajo o estrés', 'Una prolactina alta o, rara vez, un problema en la hipófisis'],
  },
  lh: {
    what: 'La hormona luteinizante (LH) la produce la hipófisis. Una subida fuerte a mitad del ciclo (el pico de LH) provoca la ovulación, la salida del óvulo. Su nivel cambia a lo largo del ciclo, por eso GiGi la lee según la fase de tu ciclo.',
    high: ['Análisis hecho durante el pico de mitad de ciclo, que es normal y dura 1–2 días', 'Síndrome de ovario poliquístico (SOP), en el que la LH suele estar alta en relación con la FSH', 'Perimenopausia o menopausia', 'Insuficiencia ovárica prematura'],
    low: ['La píldora anticonceptiva combinada u otros medicamentos hormonales', 'La lactancia', 'Poca energía disponible: ejercicio intenso, peso bajo o estrés', 'Una prolactina alta o, rara vez, un problema en la hipófisis'],
  },
  estradiol: {
    what: 'El estradiol es la forma principal de estrógeno. Lo producen sobre todo los ovarios, prepara el revestimiento del útero y es importante para los huesos, el corazón, la piel y el estado de ánimo. Llega a su punto más alto justo antes de la ovulación y cambia a lo largo del ciclo.',
    high: ['Análisis hecho justo antes de la ovulación, cuando sube de forma natural', 'Tratamientos con estrógenos, como tratamientos de fertilidad o terapia hormonal', 'Un quiste de ovario que produce hormonas'],
    low: ['Perimenopausia o menopausia', 'La píldora anticonceptiva combinada', 'La lactancia', 'Poca energía disponible: ejercicio intenso, peso bajo o estrés', 'Insuficiencia ovárica prematura'],
  },
  progesterone: {
    what: 'La progesterona la produce el ovario después de la ovulación y prepara el revestimiento del útero para un posible embarazo. Medida unos 7 días antes de la próxima regla, un valor por encima de 3 ng/mL sugiere que hubo ovulación.',
    high: ['Análisis hecho en la segunda mitad del ciclo, después de la ovulación — es lo esperado', 'Embarazo', 'Medicamentos con progesterona o tratamiento de fertilidad'],
    low: ['Análisis hecho demasiado pronto o demasiado tarde — el mejor momento es unos 7 días antes de la próxima regla', 'Un ciclo sin ovulación, algo que puede pasarle de vez en cuando a cualquier mujer', 'Condiciones que alteran la ovulación, como el SOP o problemas de tiroides', 'La píldora combinada o la menopausia'],
  },
  amh: {
    what: 'La hormona antimülleriana (AMH) la producen los pequeños folículos de los ovarios. Da una idea de cuántos óvulos quedan (reserva ovárica) y baja de forma natural con la edad. No mide la calidad de los óvulos y, por sí sola, no dice si te quedarás embarazada.',
    high: ['Síndrome de ovario poliquístico (SOP), en el que los ovarios tienen muchos folículos pequeños', 'Ser más joven — la AMH es más alta de forma natural a los veintipocos años'],
    low: ['Descenso natural con la edad', 'Una reserva ovárica menor de lo habitual para tu edad', 'Cirugía de ovarios, quistes de endometriosis o quimioterapia', 'La píldora combinada puede bajar un poco la AMH mientras la tomas'],
  },
  prolactin: {
    what: 'La prolactina la produce la hipófisis. Su función principal es producir la leche materna. Fuera del embarazo y la lactancia, un nivel alto puede detener la ovulación y la regla.',
    high: ['Embarazo o lactancia — es lo esperado', 'Estrés, dormir mal, ejercicio o estimulación del pecho poco antes del análisis', 'Algunos medicamentos, como ciertos antidepresivos, antipsicóticos o medicamentos para las náuseas', 'Tiroides lenta (hipotiroidismo)', 'Un pequeño tumor en la hipófisis, normalmente benigno (prolactinoma)'],
    low: ['Un valor bajo rara vez es un problema por sí solo'],
  },
  testosterone: {
    what: 'Las mujeres producen pequeñas cantidades de testosterona en los ovarios y en las glándulas suprarrenales. Ayuda a la energía, los músculos, los huesos y el deseo sexual.',
    high: ['Síndrome de ovario poliquístico (SOP), la causa más frecuente', 'Problemas en las suprarrenales, como la hiperplasia suprarrenal congénita no clásica', 'Medicamentos o suplementos con hormonas', 'Rara vez, un tumor que produce hormonas en un ovario o una suprarrenal'],
    low: ['La píldora anticonceptiva combinada', 'Descenso natural con la edad y después de la menopausia', 'Extirpación de los ovarios'],
  },
  shbg: {
    what: 'La SHBG (globulina fijadora de hormonas sexuales) es una proteína que produce el hígado y que transporta la testosterona y los estrógenos en la sangre. Cuanta más SHBG, menos testosterona libre (activa).',
    high: ['La píldora anticonceptiva combinada o un tratamiento con estrógenos', 'Embarazo', 'Tiroides acelerada (hipertiroidismo)', 'Peso bajo'],
    low: ['Resistencia a la insulina o un peso más alto', 'Síndrome de ovario poliquístico (SOP)', 'Tiroides lenta (hipotiroidismo)'],
  },
  dheas: {
    what: 'El DHEA-S es una hormona que producen casi solo las glándulas suprarrenales. El cuerpo puede convertirla en testosterona y estrógenos. Baja de forma natural con la edad.',
    high: ['Síndrome de ovario poliquístico (SOP)', 'Problemas en las suprarrenales, como la hiperplasia suprarrenal congénita no clásica', 'Suplementos de DHEA', 'Rara vez, un tumor suprarrenal que produce hormonas'],
    low: ['Descenso natural con la edad', 'Medicamentos corticoides, como la prednisona', 'Menos a menudo, suprarrenales que no funcionan bien'],
  },
  tsh: {
    what: 'La TSH (hormona estimulante del tiroides) es la señal de la hipófisis que le dice al tiroides cuánto trabajar. Suele ser la primera prueba del tiroides: cuando va lento, la TSH sube; cuando va acelerado, la TSH baja. Si buscas embarazo, muchos médicos buscan una TSH por debajo de 2,5.',
    high: ['Tiroides lento (hipotiroidismo), a menudo por tiroiditis de Hashimoto', 'Una dosis demasiado baja de la medicación para el tiroides', 'Recuperación de una enfermedad reciente'],
    low: ['Tiroides acelerado (hipertiroidismo), como la enfermedad de Graves', 'Una dosis demasiado alta de la medicación para el tiroides', 'Inicio del embarazo, cuando la TSH puede bajar un poco'],
  },
  free_t4: {
    what: 'La T4 libre (tiroxina) es la hormona principal que produce el tiroides. “Libre” es la parte activa, la que no va unida a proteínas. Se lee junto con la TSH.',
    high: ['Tiroides acelerado (hipertiroidismo)', 'Una dosis demasiado alta de la medicación para el tiroides', 'Los suplementos de biotina tomados antes del análisis pueden alterar algunas pruebas'],
    low: ['Tiroides lento (hipotiroidismo)', 'Una dosis demasiado baja de la medicación para el tiroides', 'Rara vez, un problema en la hipófisis'],
  },
  free_t3: {
    what: 'La T3 libre es la hormona tiroidea más activa. El cuerpo fabrica la mayor parte a partir de la T4. Se lee junto con la TSH y la T4 libre.',
    high: ['Tiroides acelerado (hipertiroidismo)', 'Demasiada medicación para el tiroides'],
    low: ['Tiroides lento', 'Comer poco para tu nivel de actividad o entrenar de forma muy intensa', 'Una enfermedad reciente'],
  },
  anti_tpo: {
    what: 'Los anticuerpos anti-TPO atacan una enzima del tiroides. Un resultado positivo indica que el sistema inmune reacciona contra el tiroides (enfermedad tiroidea autoinmune, normalmente Hashimoto). Muchas mujeres con anticuerpos positivos tienen el tiroides funcionando bien, pero conviene seguirlo, sobre todo antes y durante el embarazo.',
    high: ['Tiroiditis de Hashimoto', 'Enfermedad de Graves', 'A veces es positivo en mujeres con el tiroides funcionando con normalidad'],
  },
  glucose: {
    what: 'La glucosa en ayunas es el nivel de azúcar en la sangre tras al menos 8 horas sin comer. Muestra cómo controla tu cuerpo el azúcar. De 100 a 125 mg/dL es el rango de prediabetes y 126 mg/dL o más es el rango de diabetes.',
    high: ['No estar en ayunas en el análisis', 'Prediabetes o diabetes (el diagnóstico lo hace un médico y suele necesitar un segundo análisis)', 'Resistencia a la insulina', 'Estrés, enfermedad o medicamentos corticoides'],
    low: ['Mucho tiempo sin comer o ejercicio intenso antes del análisis', 'Algunos medicamentos para la diabetes', 'Si tienes temblor, sudor o confusión, consulta a un médico'],
  },
  hba1c: {
    what: 'La HbA1c (hemoglobina glicosilada) muestra la media de azúcar en sangre de los últimos 2–3 meses. No necesita ayuno. De 5,7 a 6,4 % es el rango de prediabetes y 6,5 % o más es el rango de diabetes.',
    high: ['Prediabetes o diabetes (el diagnóstico lo hace un médico)', 'La anemia por falta de hierro puede subir un poco la HbA1c'],
    low: ['Condiciones que acortan la vida de los glóbulos rojos, o una pérdida de sangre reciente', 'Una transfusión de sangre reciente'],
  },
  insulin: {
    what: 'La insulina es la hormona que lleva el azúcar de la sangre al interior de las células. La insulina en ayunas muestra cuánta necesita tu cuerpo para mantener el azúcar normal. GiGi también la usa para calcular el HOMA-IR, una medida de la resistencia a la insulina.',
    high: ['Resistencia a la insulina, a menudo ligada al SOP, a un peso más alto o al sedentarismo', 'No estar en ayunas en el análisis', 'Prediabetes'],
    low: ['Normalmente no es un problema si la glucosa está normal', 'Con la glucosa alta, puede indicar que el cuerpo produce poca insulina — debe valorarlo un médico'],
  },
  chol_total: {
    what: 'El colesterol total es todo el colesterol de la sangre, el “bueno” (HDL) y el “malo” (LDL) juntos. Se lee junto con el LDL, el HDL y los triglicéridos.',
    high: ['Alimentación, sedentarismo y genética', 'Tiroides lento (hipotiroidismo)', 'La menopausia, cuando el colesterol tiende a subir', 'Colesterol alto hereditario (hipercolesterolemia familiar)'],
    low: ['Normalmente no es un problema', 'A veces, tiroides acelerado o mala alimentación'],
  },
  ldl: {
    what: 'El LDL es el colesterol “malo”. Con los años, un LDL alto puede acumularse en las arterias y aumentar el riesgo de enfermedad del corazón e ictus.',
    high: ['Alimentación rica en grasas saturadas, sedentarismo y genética', 'Tiroides lento (hipotiroidismo)', 'La menopausia', 'Colesterol alto hereditario (hipercolesterolemia familiar), sobre todo si el LDL es muy alto a una edad joven o hay enfermedad del corazón en la familia'],
  },
  hdl: {
    what: 'El HDL es el colesterol “bueno”. Ayuda a retirar el exceso de colesterol de las arterias. En las mujeres, un valor por debajo de 50 mg/dL es un marcador de riesgo.',
    low: ['Sedentarismo, tabaco o un peso más alto', 'Resistencia a la insulina, prediabetes o diabetes', 'Genética'],
  },
  triglycerides: {
    what: 'Los triglicéridos son un tipo de grasa en la sangre que el cuerpo usa como energía. Suben después de comer, por eso el análisis se hace en ayunas.',
    high: ['No estar en ayunas en el análisis', 'Alimentación con mucho azúcar, hidratos refinados o alcohol', 'Resistencia a la insulina, prediabetes o diabetes', 'La píldora combinada u otros medicamentos con estrógenos pueden subirlos un poco', 'Tiroides lento (hipotiroidismo)'],
    low: ['Normalmente no es un problema'],
  },
  haemoglobin: {
    what: 'La hemoglobina es la proteína de los glóbulos rojos que lleva el oxígeno por el cuerpo. Un valor bajo se llama anemia y puede causar cansancio, falta de aire y palidez.',
    high: ['Deshidratación', 'Tabaco o vivir en altitud', 'Rara vez, una enfermedad de la médula ósea'],
    low: ['Falta de hierro, a menudo por reglas abundantes o una alimentación pobre en hierro', 'Falta de vitamina B12 o de folato', 'Embarazo', 'Pérdida de sangre u otras condiciones que un médico puede estudiar'],
  },
  mcv: {
    what: 'El VCM (volumen corpuscular medio) es el tamaño medio de tus glóbulos rojos. Ayuda a encontrar la causa de una anemia: las células pequeñas suelen indicar falta de hierro; las grandes, falta de vitamina B12 o folato.',
    high: ['Falta de vitamina B12 o de folato', 'Alcohol', 'Tiroides lento o algunos medicamentos'],
    low: ['Falta de hierro', 'Condiciones hereditarias, como el rasgo talasémico'],
  },
  wbc: {
    what: 'Los glóbulos blancos (leucocitos) combaten las infecciones. Su número sube cuando el cuerpo lucha contra una infección o una inflamación.',
    high: ['Una infección, como una infección de orina o respiratoria', 'Inflamación, estrés o ejercicio intenso', 'Embarazo o medicamentos corticoides', 'Rara vez, una enfermedad de la sangre — el médico suele repetir el análisis'],
    low: ['Una infección vírica reciente', 'Algunos medicamentos', 'Enfermedades autoinmunes', 'Rara vez, un problema de la médula ósea — el médico suele repetir el análisis'],
  },
  platelets: {
    what: 'Las plaquetas son pequeñas células de la sangre que ayudan a la coagulación y a detener las hemorragias.',
    high: ['Falta de hierro', 'Infección o inflamación', 'Una pérdida de sangre reciente', 'Rara vez, una enfermedad de la médula ósea'],
    low: ['Una infección vírica reciente', 'Algunos medicamentos', 'Enfermedades autoinmunes o problemas de hígado', 'Si te salen moratones o sangras con facilidad, consulta pronto a un médico'],
  },
  ferritin: {
    what: 'La ferritina muestra cuánto hierro tiene guardado tu cuerpo. Las reservas pueden bajar antes de que cambie la hemoglobina. Un valor entre 15 y 30 ng/mL ya sugiere reservas de hierro bajas, aunque esté dentro del rango del laboratorio.',
    high: ['Inflamación o infección — la ferritina sube cuando el cuerpo está inflamado', 'Problemas de hígado o alcohol', 'Exceso de hierro, por suplementos o por una condición hereditaria (hemocromatosis)'],
    low: ['Reglas abundantes', 'Alimentación pobre en hierro, por ejemplo vegetariana o vegana sin suplementos', 'Embarazo o un parto reciente', 'Mala absorción, como en la celiaquía'],
  },
  iron: {
    what: 'El hierro sérico es la cantidad de hierro que circula en la sangre en ese momento. Cambia mucho a lo largo del día y con las comidas, por eso se lee junto con la ferritina.',
    high: ['Suplementos de hierro o una comida rica en hierro poco antes del análisis', 'Exceso de hierro acumulado (hemocromatosis)', 'Problemas de hígado'],
    low: ['Falta de hierro, a menudo por reglas abundantes', 'Inflamación o infección', 'Embarazo'],
  },
  vitamin_d: {
    what: 'La vitamina D ayuda al cuerpo a absorber el calcio y es importante para los huesos, los músculos y las defensas. La piel la fabrica con la luz del sol. De 20 a 29 ng/mL es insuficiente y por debajo de 20 ng/mL es déficit.',
    high: ['Suplementos de vitamina D en dosis altas'],
    low: ['Poca exposición al sol, sobre todo en invierno', 'Piel más oscura o ropa que cubre la piel', 'Un peso más alto', 'Mala absorción, como en la celiaquía'],
  },
  b12: {
    what: 'La vitamina B12 es necesaria para fabricar glóbulos rojos y mantener sanos los nervios. De 200 a 300 pg/mL es límite.',
    high: ['Suplementos o inyecciones de B12', 'Rara vez, enfermedades del hígado o de la sangre'],
    low: ['Alimentación vegana o vegetariana sin suplementos', 'Mala absorción: anemia perniciosa, celiaquía o cirugía de estómago', 'Algunos medicamentos, como la metformina o los protectores de estómago tomados mucho tiempo'],
  },
  folate: {
    what: 'El folato (vitamina B9) es necesario para formar células nuevas. Antes y al inicio del embarazo reduce el riesgo de defectos del tubo neural en el bebé, por eso quien busca embarazo debe tomar ácido fólico.',
    high: ['Suplementos de ácido fólico — normalmente no es un problema'],
    low: ['Alimentación pobre en verduras de hoja, legumbres y alimentos enriquecidos', 'Alcohol', 'Mala absorción, como en la celiaquía', 'Algunos medicamentos, como el metotrexato o algunos antiepilépticos'],
  },
  rubella_igg: {
    what: 'La rubéola IgG muestra si estás protegida contra la rubéola, que puede dañar gravemente al bebé durante el embarazo. 10 UI/mL o más significa que estás inmunizada.',
    low: ['Nunca te vacunaron o la protección ha bajado. Un médico puede ofrecerte la vacuna triple vírica; después, evita quedarte embarazada durante 1 mes.'],
  },
};

const INFO = { en, pt, es };

/** Plain-language info for a marker, in the app language (English as fallback). */
export function markerInfo(code, lang) {
  return INFO[lang]?.[code] || en[code] || null;
}

export const INFO_CODES = Object.keys(en);
