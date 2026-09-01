import { modalityInfo } from "../../lib/theme";

const musculacaoColor = modalityInfo("musculacao").color;

/* A purple-family spread keeps every chart in this module visually tied to
   the Musculação identity color, the same way Corrida's TYPES lean on teal. */
export const MUSCLE_GROUPS = [
  { id: "costas", label: "Costas", color: musculacaoColor },
  { id: "peito", label: "Peito", color: "#A78BFA" },
  { id: "pernas", label: "Pernas", color: "#6D28D9" },
  { id: "ombros", label: "Ombros", color: "#C084FC" },
  { id: "biceps", label: "Bíceps", color: "#7C3AED" },
  { id: "triceps", label: "Tríceps", color: "#D8B4FE" },
  { id: "gluteos", label: "Glúteos", color: "#E879F9" },
  { id: "panturrilha", label: "Panturrilha", color: "#A855F7" },
  { id: "abdomen", label: "Abdômen", color: "#5B21B6" },
  { id: "antebraco", label: "Antebraço", color: "#DDD6FE" },
];
export const muscleGroupInfo = (id) => MUSCLE_GROUPS.find((g) => g.id === id) || MUSCLE_GROUPS[0];

export const EQUIPMENT = ["Barra", "Halteres", "Máquina", "Cabo/Polia", "Peso corporal", "Kettlebell", "Outro"];

export const DEFAULT_SETS = 3;

/* Como a série de cada exercício é registrada e computada — três dimensões
   mutuamente exclusivas, independentes do grupo muscular/equipamento:
   - load_reps: carga x repetições (padrão — maioria dos exercícios).
   - reps_only: só repetições, sem carga (peso corporal: flexão, barra
     fixa, abdominais soltos).
   - time: só duração, sem carga nem reps (isometria: prancha, dead hang).
   Um exercício sem metricType salvo (fichas/sessões antigas) é tratado como
   load_reps — ver exerciseMetricType() abaixo. */
export const METRIC_TYPES = [
  { id: "load_reps", label: "Carga x repetições" },
  { id: "reps_only", label: "Repetições (peso corporal)" },
  { id: "time", label: "Tempo (isometria)" },
];
export const metricTypeInfo = (id) => METRIC_TYPES.find((m) => m.id === id) || METRIC_TYPES[0];

/* Fallback pra exercícios gravados antes dessa mudança — nunca tiveram
   metricType salvo, então sempre foram tratados como carga x repetições. */
export const exerciseMetricType = (ex) => ex?.metricType || "load_reps";

/* Built-in catalog so exercise names stay consistent across sessions (that
   consistency is what makes per-exercise history/PRs work) while still
   letting the user type a custom one via ExercisePicker. */
export const EXERCISE_CATALOG = [
  { id: "supino-reto", name: "Supino Reto", muscleGroup: "peito", equipment: "Barra", metricType: "load_reps" },
  { id: "supino-inclinado", name: "Supino Inclinado", muscleGroup: "peito", equipment: "Barra", metricType: "load_reps" },
  { id: "supino-declinado", name: "Supino Declinado", muscleGroup: "peito", equipment: "Barra", metricType: "load_reps" },
  { id: "supino-halteres", name: "Supino com Halteres", muscleGroup: "peito", equipment: "Halteres", metricType: "load_reps" },
  { id: "crucifixo", name: "Crucifixo", muscleGroup: "peito", equipment: "Halteres", metricType: "load_reps" },
  { id: "crossover", name: "Crossover", muscleGroup: "peito", equipment: "Cabo/Polia", metricType: "load_reps" },
  { id: "paralelas", name: "Paralelas", muscleGroup: "peito", equipment: "Peso corporal", metricType: "reps_only" },
  { id: "flexao", name: "Flexão de Braço", muscleGroup: "peito", equipment: "Peso corporal", metricType: "reps_only" },
  { id: "peck-deck", name: "Peck Deck", muscleGroup: "peito", equipment: "Máquina", metricType: "load_reps" },

  { id: "puxada-alta", name: "Puxada Alta", muscleGroup: "costas", equipment: "Cabo/Polia", metricType: "load_reps" },
  { id: "puxada-triangulo", name: "Puxada Triângulo", muscleGroup: "costas", equipment: "Cabo/Polia", metricType: "load_reps" },
  { id: "barra-fixa", name: "Barra Fixa", muscleGroup: "costas", equipment: "Peso corporal", metricType: "reps_only" },
  { id: "remada-curvada", name: "Remada Curvada", muscleGroup: "costas", equipment: "Barra", metricType: "load_reps" },
  { id: "remada-unilateral", name: "Remada Unilateral", muscleGroup: "costas", equipment: "Halteres", metricType: "load_reps" },
  { id: "remada-baixa", name: "Remada Baixa", muscleGroup: "costas", equipment: "Cabo/Polia", metricType: "load_reps" },
  { id: "remada-cavalinho", name: "Remada Cavalinho", muscleGroup: "costas", equipment: "Barra", metricType: "load_reps" },
  { id: "pulldown", name: "Pulldown", muscleGroup: "costas", equipment: "Cabo/Polia", metricType: "load_reps" },
  { id: "levantamento-terra", name: "Levantamento Terra", muscleGroup: "costas", equipment: "Barra", metricType: "load_reps" },
  { id: "hiperextensao", name: "Hiperextensão", muscleGroup: "costas", equipment: "Peso corporal", metricType: "reps_only" },

  { id: "desenvolvimento-militar", name: "Desenvolvimento Militar", muscleGroup: "ombros", equipment: "Barra", metricType: "load_reps" },
  { id: "desenvolvimento-halteres", name: "Desenvolvimento com Halteres", muscleGroup: "ombros", equipment: "Halteres", metricType: "load_reps" },
  { id: "elevacao-lateral", name: "Elevação Lateral", muscleGroup: "ombros", equipment: "Halteres", metricType: "load_reps" },
  { id: "elevacao-frontal", name: "Elevação Frontal", muscleGroup: "ombros", equipment: "Halteres", metricType: "load_reps" },
  { id: "crucifixo-invertido", name: "Crucifixo Invertido", muscleGroup: "ombros", equipment: "Halteres", metricType: "load_reps" },
  { id: "encolhimento", name: "Encolhimento", muscleGroup: "ombros", equipment: "Barra", metricType: "load_reps" },
  { id: "remada-alta", name: "Remada Alta", muscleGroup: "ombros", equipment: "Barra", metricType: "load_reps" },

  { id: "rosca-direta", name: "Rosca Direta", muscleGroup: "biceps", equipment: "Barra", metricType: "load_reps" },
  { id: "rosca-alternada", name: "Rosca Alternada", muscleGroup: "biceps", equipment: "Halteres", metricType: "load_reps" },
  { id: "rosca-martelo", name: "Rosca Martelo", muscleGroup: "biceps", equipment: "Halteres", metricType: "load_reps" },
  { id: "rosca-scott", name: "Rosca Scott", muscleGroup: "biceps", equipment: "Barra", metricType: "load_reps" },
  { id: "rosca-concentrada", name: "Rosca Concentrada", muscleGroup: "biceps", equipment: "Halteres", metricType: "load_reps" },
  { id: "rosca-cabo", name: "Rosca no Cabo", muscleGroup: "biceps", equipment: "Cabo/Polia", metricType: "load_reps" },

  { id: "triceps-corda", name: "Tríceps Corda", muscleGroup: "triceps", equipment: "Cabo/Polia", metricType: "load_reps" },
  { id: "triceps-frances", name: "Tríceps Francês", muscleGroup: "triceps", equipment: "Halteres", metricType: "load_reps" },
  { id: "triceps-testa", name: "Tríceps Testa", muscleGroup: "triceps", equipment: "Barra", metricType: "load_reps" },
  { id: "triceps-banco", name: "Tríceps no Banco", muscleGroup: "triceps", equipment: "Peso corporal", metricType: "reps_only" },
  { id: "triceps-barra", name: "Tríceps na Barra", muscleGroup: "triceps", equipment: "Cabo/Polia", metricType: "load_reps" },

  { id: "agachamento-livre", name: "Agachamento Livre", muscleGroup: "pernas", equipment: "Barra", metricType: "load_reps" },
  { id: "leg-press", name: "Leg Press", muscleGroup: "pernas", equipment: "Máquina", metricType: "load_reps" },
  { id: "cadeira-extensora", name: "Cadeira Extensora", muscleGroup: "pernas", equipment: "Máquina", metricType: "load_reps" },
  { id: "cadeira-flexora", name: "Cadeira Flexora", muscleGroup: "pernas", equipment: "Máquina", metricType: "load_reps" },
  { id: "afundo", name: "Afundo", muscleGroup: "pernas", equipment: "Halteres", metricType: "load_reps" },
  { id: "stiff", name: "Stiff", muscleGroup: "pernas", equipment: "Barra", metricType: "load_reps" },
  { id: "agachamento-bulgaro", name: "Agachamento Búlgaro", muscleGroup: "pernas", equipment: "Halteres", metricType: "load_reps" },
  { id: "hack-machine", name: "Hack Machine", muscleGroup: "pernas", equipment: "Máquina", metricType: "load_reps" },
  { id: "mesa-flexora", name: "Mesa Flexora", muscleGroup: "pernas", equipment: "Máquina", metricType: "load_reps" },
  { id: "agachamento-livre-corporal", name: "Agachamento Livre (peso corporal)", muscleGroup: "pernas", equipment: "Peso corporal", metricType: "reps_only" },

  { id: "elevacao-pelvica", name: "Elevação Pélvica", muscleGroup: "gluteos", equipment: "Barra", metricType: "load_reps" },
  { id: "gluteo-cabo", name: "Glúteo no Cabo", muscleGroup: "gluteos", equipment: "Cabo/Polia", metricType: "load_reps" },
  { id: "cadeira-abdutora", name: "Cadeira Abdutora", muscleGroup: "gluteos", equipment: "Máquina", metricType: "load_reps" },

  { id: "panturrilha-em-pe", name: "Panturrilha em Pé", muscleGroup: "panturrilha", equipment: "Máquina", metricType: "load_reps" },
  { id: "panturrilha-sentado", name: "Panturrilha Sentado", muscleGroup: "panturrilha", equipment: "Máquina", metricType: "load_reps" },
  { id: "panturrilha-leg-press", name: "Panturrilha no Leg Press", muscleGroup: "panturrilha", equipment: "Máquina", metricType: "load_reps" },

  { id: "abdominal-supra", name: "Abdominal Supra", muscleGroup: "abdomen", equipment: "Peso corporal", metricType: "reps_only" },
  { id: "abdominal-infra", name: "Abdominal Infra", muscleGroup: "abdomen", equipment: "Peso corporal", metricType: "reps_only" },
  { id: "prancha", name: "Prancha", muscleGroup: "abdomen", equipment: "Peso corporal", metricType: "time" },
  { id: "prancha-lateral", name: "Prancha Lateral", muscleGroup: "abdomen", equipment: "Peso corporal", metricType: "time" },
  { id: "abdominal-cabo", name: "Abdominal no Cabo", muscleGroup: "abdomen", equipment: "Cabo/Polia", metricType: "load_reps" },
  { id: "elevacao-pernas", name: "Elevação de Pernas", muscleGroup: "abdomen", equipment: "Peso corporal", metricType: "reps_only" },

  { id: "rosca-punho", name: "Rosca de Punho", muscleGroup: "antebraco", equipment: "Barra", metricType: "load_reps" },
  { id: "rosca-inversa", name: "Rosca Inversa", muscleGroup: "antebraco", equipment: "Barra", metricType: "load_reps" },
  { id: "dead-hang", name: "Dead Hang", muscleGroup: "antebraco", equipment: "Peso corporal", metricType: "time" },
];
export const exerciseCatalogInfo = (id) => EXERCISE_CATALOG.find((e) => e.id === id) || null;
