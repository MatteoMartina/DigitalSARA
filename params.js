// ============================================================
// params.js — Parametri Digital Twin POP
// Traduzione da parametri_twin.R v4
// 28 paper | ~50.000 pazienti
// Unità temporale: MESI
// ============================================================

const PARAMS = {

  // --- RATE BASE (per mese) ---
  // S1: stato evento — scelta trattamento
  q_S1_S2: 0.622,   // scelta pessario (PEOPLE cohort 2022)
  q_S1_S3: 0.378,   // scelta chirurgia

  // S2: pessario
  q_S2_S3: 0.0109,  // crossover chirurgia (Meister 2023)
  q_S2_S8: 0.00944, // remissione conservativa (Manchana 2024)

  // S3: stato evento quasi istantaneo
  q_S3_S4: 3.0,

  // S4: remissione — set COMPOSITO (piecewise)
  q_S4_S5a_fase1: 0.02252,  // mesi 0-24 (OPTIMAL + Roos 2021)
  q_S4_S5a_fase2: 0.01126,  // mesi >24
  q_S4_S5a_cutoff: 24,
  q_S4_S5p: 0.00354,        // Schulten 2022
  q_S4_S6:  0.00109,        // Schulten 2022

  // S4: remissione — set ANATOMICO (costante)
  q_S4_S5a_anat: 0.01423,   // Schulten 2022
  q_S4_S5p_anat: 0.00354,
  q_S4_S6_anat:  0.00109,

  // S5 → S7
  q_S5a_S7: 0.00699,  // Chang 2021
  q_S5p_S7: 0.00452,  // Winkelman proxy
  q_S6_S7:  0.00148,  // OPTIMAL 2018

  // S7: re-intervento
  q_S7_totale: -Math.log(0.5) / 30,  // mediana 2.5 anni
  q_S7_S3_prop: 0.80,
  q_S7_S2_prop: 0.20,

  // --- LOG-HR TECNICA (set COMPOSITO) ---
  logHR_composita: {
    native_ULS:          0,
    native_SSLF:         Math.log(0.703 / 0.615),
    native_SSLF_nograft: Math.log(0.703 / 0.615) + 0.839,
    SCP:                 -0.5621,
    VH_MMC:              -1.475,
    mesh:                -0.5108
  },

  // --- LOG-HR TECNICA (set ANATOMICO) ---
  logHR_anatomica: {
    native_ULS:          0,
    native_SSLF:         0,
    native_SSLF_nograft: 0.839,
    SCP:                 Math.log(0.094 / 0.193),
    VH_MMC:              -1.670,
    mesh:                -0.5108
  },

  // --- LOG-HR S6→S7 per tecnica ---
  logHR_S6S7: {
    SCP: -1.2379,
    default: 0
  },

  // --- COVARIATE S4→S5a ---
  cov_S4_S5a: {
    BMI:          { log_coef: 0.1044, ref: 26 },
    Ba_preop:     { log_coef: 0.1739, ref: 0  },
    stadio_34:    { log_coef: 0.8459           },
    eta:          { log_coef: 0.0602, ref: 65  },
    levator_defect: { log_coef: 1.0919         }
  },

  // --- COVARIATE S1 ---
  cov_S1_S2: {
    eta:                { log_coef: 0.0953, ref: 65 },
    stadio_avanzato:    { log_coef: -0.2614 },
    chirurgia_pregressa:{ log_coef: -1.4697 }
  },

  // --- COVARIATE S2→S8 ---
  cov_S2_S8: {
    eta_60_69:   { log_coef: -Math.log(0.53) },
    eta_ge70:    { log_coef: -Math.log(0.41) },
    punto_C_ge0: { log_coef: -Math.log(0.46) }
  },

  // --- NOMI STATI ---
  stati: ["S1","S2","S3","S4","S5a","S5p","S6","S7","S8"],
  nomi_stati: {
    S1:  "Diagnosi",
    S2:  "Pessario",
    S3:  "Chirurgia",
    S4:  "Remissione",
    S5a: "Recidiva anteriore",
    S5p: "Recidiva posteriore",
    S6:  "Recidiva apicale",
    S7:  "Re-intervento",
    S8:  "Remissione conservativa"
  },

  // --- TECNICHE ---
  tecniche: {
    native_ULS:          "Native tissue ULS",
    native_SSLF:         "SSLF (con graft)",
    native_SSLF_nograft: "SSLF (senza graft)",
    SCP:                 "Sacrocolpopessi (SCP)",
    VH_MMC:              "VH + MMC",
    mesh:                "Mesh transaddominale"
  }
};
