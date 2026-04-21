// ============================================================
// model.js — Digital Twin POP — Logica modello multi-stato
// Traduzione da msm_skeleton.R v4
// Usa math.js per matrice esponenziale
// ============================================================

// Costruisce Q matrix 9x9
function buildQ(definizione, tecnica, covariate) {
  const p = PARAMS;
  const n = 9;
  // indici: S1=0 S2=1 S3=2 S4=3 S5a=4 S5p=5 S6=6 S7=7 S8=8

  // Q inizia a zero
  let Q = Array.from({length: n}, () => Array(n).fill(0));

  // Transizioni indipendenti da definizione
  Q[0][1] = p.q_S1_S2;   // S1→S2
  Q[0][2] = p.q_S1_S3;   // S1→S3
  Q[1][2] = p.q_S2_S3;   // S2→S3
  Q[1][8] = p.q_S2_S8;   // S2→S8
  Q[2][3] = p.q_S3_S4;   // S3→S4
  Q[4][7] = p.q_S5a_S7;  // S5a→S7
  Q[5][7] = p.q_S5p_S7;  // S5p→S7
  Q[6][7] = p.q_S6_S7;   // S6→S7
  Q[7][2] = p.q_S7_totale * p.q_S7_S3_prop;  // S7→S3
  Q[7][1] = p.q_S7_totale * p.q_S7_S2_prop;  // S7→S2

  // Transizioni dipendenti da definizione
  if (definizione === "composita") {
    Q[3][4] = p.q_S4_S5a_fase1;  // usa fase1 come base
    Q[3][5] = p.q_S4_S5p;
    Q[3][6] = p.q_S4_S6;
  } else {
    Q[3][4] = p.q_S4_S5a_anat;
    Q[3][5] = p.q_S4_S5p_anat;
    Q[3][6] = p.q_S4_S6_anat;
  }

  // Applica log-HR tecnica su S4→S5a/S5p/S6
  const hrSet = definizione === "composita"
    ? p.logHR_composita : p.logHR_anatomica;
  const logHR = hrSet[tecnica] !== undefined ? hrSet[tecnica] : 0;

  Q[3][4] *= Math.exp(logHR);
  Q[3][5] *= Math.exp(logHR * 0.5);
  Q[3][6] *= Math.exp(logHR * 0.5);

  // Log-HR S6→S7 per tecnica
  const logHR_S6S7 = tecnica === "SCP" ? p.logHR_S6S7.SCP : 0;
  Q[6][7] *= Math.exp(logHR_S6S7);

  // Applica covariate S4→S5a
  if (covariate) {
    const c = p.cov_S4_S5a;
    let logHR_cov = 0;
    if (covariate.BMI !== undefined)
      logHR_cov += c.BMI.log_coef * (covariate.BMI - c.BMI.ref);
    if (covariate.Ba_preop !== undefined)
      logHR_cov += c.Ba_preop.log_coef * covariate.Ba_preop;
    if (covariate.stadio_34)
      logHR_cov += c.stadio_34.log_coef;
    if (covariate.eta !== undefined)
      logHR_cov += c.eta.log_coef * (covariate.eta - c.eta.ref);
    if (covariate.levator_defect)
      logHR_cov += c.levator_defect.log_coef;

    Q[3][4] *= Math.exp(logHR_cov);
  }

  // Covariate S1
  if (covariate && covariate.statoIniziale === 0) {
    const c = p.cov_S1_S2;
    let logHR_S1 = 0;
    if (covariate.eta !== undefined)
      logHR_S1 += c.eta.log_coef * (covariate.eta - c.eta.ref);
    if (covariate.stadio_avanzato)
      logHR_S1 += c.stadio_avanzato.log_coef;
    if (covariate.chirurgia_pregressa)
      logHR_S1 += c.chirurgia_pregressa.log_coef;
    Q[0][1] *= Math.exp(logHR_S1);
    Q[0][2] *= Math.exp(-logHR_S1 * 0.5);
  }

  // Covariate S2→S8
  if (covariate && covariate.statoIniziale === 1) {
    const c = p.cov_S2_S8;
    let logHR_S2 = 0;
    if (covariate.punto_C_ge0) logHR_S2 += c.punto_C_ge0.log_coef;
    if (covariate.eta >= 70)   logHR_S2 += c.eta_ge70.log_coef;
    else if (covariate.eta >= 60) logHR_S2 += c.eta_60_69.log_coef;
    Q[1][8] *= Math.exp(logHR_S2);
  }

  return Q;
}

// Calcola diagonale Q (q_ii = -somma riga)
function addDiagonal(Q) {
  const n = Q.length;
  let Qd = Q.map(row => [...row]);
  for (let i = 0; i < n; i++) {
    Qd[i][i] = -Q[i].reduce((s, v, j) => j !== i ? s + v : s, 0);
  }
  return Qd;
}

// Matrice esponenziale via math.js
function matrixExp(Q, t) {
  const Qscaled = Q.map(row => row.map(v => v * t));
  return math.expm(math.matrix(Qscaled)).toArray();
}

// Predici traiettoria da stato iniziale a timepoint t
// Approssimazione piecewise per S4→S5a composita:
// usa Q_fase1 per t<=24 e concatena con Q_fase2 per t>24
function prediciTraiettoria(statoIniziale, tMesi, Q_base, definizione, tecnica, covariate) {
  const n = Q_base.length;

  // Per definizione composita: due Q matrix (fase1 e fase2)
  // La Q_base ha già fase1 — costruiamo anche fase2
  let Q_fase2 = null;
  if (definizione === "composita") {
    Q_fase2 = Q_base.map(row => [...row]);
    // Applica stesso ratio tecnica/covariate ma con rate fase2
    const ratio = Q_base[3][4] > 0
      ? Q_base[3][4] / PARAMS.q_S4_S5a_fase1
      : 1;
    Q_fase2[3][4] = PARAMS.q_S4_S5a_fase2 * ratio;
  }

  const Qd1 = addDiagonal(Q_base);
  const Qd2 = Q_fase2 ? addDiagonal(Q_fase2) : Qd1;

  // Vettore stato iniziale
  let p0 = Array(n).fill(0);
  p0[statoIniziale] = 1;

  const cutoff = PARAMS.q_S4_S5a_cutoff;
  const risultati = [];

  for (const t of tMesi) {
    let prob;
    if (definizione !== "composita" || t <= cutoff) {
      // Semplice: una sola Q
      const Pt = matrixExp(Qd1, t);
      prob = multiplyVecMat(p0, Pt);
    } else {
      // Piecewise: fase1 fino a cutoff, fase2 per il resto
      const Pt1 = matrixExp(Qd1, cutoff);
      const p_cutoff = multiplyVecMat(p0, Pt1);
      const Pt2 = matrixExp(Qd2, t - cutoff);
      prob = multiplyVecMat(p_cutoff, Pt2);
    }
    risultati.push(prob);
  }

  return risultati;
}

// Moltiplica vettore per matrice
function multiplyVecMat(vec, mat) {
  const n = vec.length;
  return mat[0].map((_, j) =>
    vec.reduce((sum, v, i) => sum + v * mat[i][j], 0)
  );
}

// Calcola probabilità cumulative da stato iniziale
// Approssimazione: P_cumulativa ≈ 1 - P(rimane nello stato iniziale)
// Per stati di permanenza (S4, S2) usa somma degli stati di arrivo
function prediciCumulativo(statoIniziale, tMesi, Q_base, definizione, tecnica, covariate, statiOutcome) {
  const probs = prediciTraiettoria(statoIniziale, tMesi, Q_base, definizione, tecnica, covariate);
  const nomiStati = PARAMS.stati;

  return tMesi.map((t, i) => {
    let P = 0;
    for (const nome of statiOutcome) {
      const idx = nomiStati.indexOf(nome);
      if (idx >= 0) P += probs[i][idx];
    }
    return Math.min(P, 1.0);
  });
}

// Funzione principale — ingresso S4 (paziente operata)
function ingressoS4(params) {
  const {
    tecnica = "native_ULS",
    BMI = 26,
    Ba_preop = 0,
    stadio_34 = false,
    fumo = false,
    eta = 65,
    levator_defect = false,
    definizione = "composita",
    tMesi = [12, 24, 36, 60, 120]
  } = params;

  const covariate = { BMI, Ba_preop, stadio_34, fumo, eta, levator_defect };
  const Q = buildQ(definizione, tecnica, covariate);
  const probs = prediciTraiettoria(3, tMesi, Q, definizione, tecnica, covariate);
  const nomi = PARAMS.stati;

  return tMesi.map((t, i) => ({
    t_mesi: t,
    P_remissione:   round3(probs[i][nomi.indexOf("S4")]),
    P_rec_ant:      round3(probs[i][nomi.indexOf("S5a")]),
    P_rec_post:     round3(probs[i][nomi.indexOf("S5p")]),
    P_rec_apic:     round3(probs[i][nomi.indexOf("S6")]),
    P_reintervento: round3(probs[i][nomi.indexOf("S7")])
  }));
}

// Funzione principale — ingresso S2 (paziente in pessario)
function ingressoS2(params) {
  const {
    tecnica = "native_ULS",
    BMI = 26, Ba_preop = 0,
    stadio_34 = false, eta = 65,
    punto_C_ge0 = false,
    definizione = "composita",
    tMesi = [12, 24, 36, 60, 120]
  } = params;

  const covariate = { statoIniziale: 1, BMI, Ba_preop, stadio_34, eta, punto_C_ge0 };
  const Q = buildQ(definizione, tecnica, covariate);
  const probs = prediciTraiettoria(1, tMesi, Q, definizione, tecnica, covariate);
  const nomi = PARAMS.stati;

  return tMesi.map((t, i) => ({
    t_mesi: t,
    P_pessario:     round3(probs[i][nomi.indexOf("S2")]),
    P_chirurgia:    round3(probs[i][nomi.indexOf("S3")] + probs[i][nomi.indexOf("S4")]),
    P_remissione:   round3(probs[i][nomi.indexOf("S4")]),
    P_rec_ant:      round3(probs[i][nomi.indexOf("S5a")]),
    P_reintervento: round3(probs[i][nomi.indexOf("S7")]),
    P_conservativa: round3(probs[i][nomi.indexOf("S8")])
  }));
}

// Funzione principale — ingresso S1 (nuova diagnosi)
function ingressoS1(params) {
  const {
    eta = 65,
    stadio_avanzato = false,
    chirurgia_pregressa = false,
    tecnica = "native_ULS",
    definizione = "composita",
    tMesi = [3, 12, 36, 60]
  } = params;

  const covariate = { statoIniziale: 0, eta, stadio_avanzato, chirurgia_pregressa };
  const Q = buildQ(definizione, tecnica, covariate);
  const probs = prediciTraiettoria(0, tMesi, Q, definizione, tecnica, covariate);
  const nomi = PARAMS.stati;

  return tMesi.map((t, i) => ({
    t_mesi: t,
    P_pessario:   round3(probs[i][nomi.indexOf("S2")] + probs[i][nomi.indexOf("S8")]),
    P_chirurgia:  round3(probs[i][nomi.indexOf("S3")] + probs[i][nomi.indexOf("S4")]),
    P_remissione: round3(probs[i][nomi.indexOf("S4")])
  }));
}

function round3(v) { return Math.round(v * 1000) / 1000; }
