# POP Digital Twin — Decision Support System

Multi-state model for pelvic organ prolapse (POP) clinical trajectory prediction.

**Live tool:** [github.io link after deployment]

## What it does

Given a patient's clinical profile, predicts the probability of being in each clinical state (remission, anterior recurrence, posterior recurrence, apical recurrence, re-intervention) at 1, 2, 3, 5, and 10 years.

Three clinical entry points:
- **Post-surgery** (S4) — risk of recurrence by compartment and re-intervention
- **On pessary** (S2) — probability of crossover to surgery and subsequent trajectory
- **New diagnosis** (S1) — initial treatment choice prediction

## Model structure

9-state continuous-time Markov model:

```
S1 (Diagnosis) → S2 (Pessary) → S3 (Surgery) → S4 (Remission)
                                                ↓         ↓         ↓
                                            S5a (Ant.) S5p (Post.) S6 (Apical)
                                                ↓         ↓         ↓
                                                      S7 (Re-intervention)
                                                       ↓         ↓
                                                    S2 (Pessary) S3 (Surgery)
S2 → S8 (Long-term conservative remission)
```

- **Baseline technique:** Native tissue ULS (OPTIMAL 2018)
- **Two outcome definitions:** Composite (anatomy + symptoms + retreat) and Anatomic (POP-Q ≥2)
- **Piecewise hazard** for S4→S5a composite: higher in first 24 months, lower after (Roos 2021)

## Parameterization

28 papers | ~50,000 patients | 6 RCT quality A

Key sources:
- OPTIMAL Jelovsek 2018 (baseline composite failure)
- Schulten 2022 RCT (anatomic failure, posterior compartment)
- Menefee 2024 (SCP vs native tissue HR)
- Meister 2023 (pessary crossover)
- Chang 2021 (retreatment after recurrence)
- Roos 2021 (piecewise hazard shape)

## External validation

13 independent papers (not used for parameterization):

| Tier | Papers | EO range |
|------|--------|----------|
| Primary | 8 outcomes | 0.52–1.89 |
| Secondary | 5 outcomes | 0.42–2.61 |

Best calibrated: posterior recurrence (Malik 2019 EO=1.46, Winkelman EO=0.81), retreatment after recurrence (Chang 2021 EO=1.01), initial treatment choice Europe (Miceli EO=1.10).

Known limitations:
- Composite failure overestimated in low-risk populations vs OPTIMAL baseline
- Re-surgery underestimated for SSLF (S5→S7 rate calibrated on SCP only)
- Pessary crossover overestimated in high surgical availability settings

## Files

```
├── index.html        # Clinical interface (GitHub Pages)
├── model.js          # Model logic (translated from R)
├── params.js         # Parameters from 28 papers
├── README.md
└── R/
    ├── parametri_twin.R      # Full parameterization
    ├── msm_skeleton.R        # Model structure + sensitivity analysis
    ├── simulazione_twin.R    # Monte Carlo simulation
    └── validazione_esterna.R # External validation
```

## Deployment on GitHub Pages

1. Fork or clone this repository
2. Go to Settings → Pages
3. Set source to `main` branch, root folder
4. The tool will be available at `https://yourusername.github.io/pop-digital-twin`

## Citation

> [Authors]. POP Digital Twin: A multi-state model for pelvic organ prolapse trajectory prediction. *[Journal]*. 2025. [DOI]

## Institution

Mauriziano Umberto I Hospital, Turin, Italy  
Department of Obstetrics and Gynecology

## Status

- [x] Paper 1: Literature parameterization + external validation
- [ ] Paper 2: Bayesian updating with Mauriziano prospective data
- [ ] Paper 3: Supervised clinical use

## License

MIT — free to use, cite the paper if you publish with it.
