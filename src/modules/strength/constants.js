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

export const STORAGE_KEY_TEMPLATES = "omnifit:musculacao:templates:v1";
export const STORAGE_KEY_SESSIONS = "omnifit:musculacao:sessions:v1";

/* Built-in catalog so exercise names stay consistent across sessions (that
   consistency is what makes per-exercise history/PRs work) while still
   letting the user type a custom one via ExercisePicker. */
export const EXERCISE_CATALOG = [
  { id: "supino-reto", name: "Supino Reto", muscleGroup: "peito", equipment: "Barra" },
  { id: "supino-inclinado", name: "Supino Inclinado", muscleGroup: "peito", equipment: "Barra" },
  { id: "supino-declinado", name: "Supino Declinado", muscleGroup: "peito", equipment: "Barra" },
  { id: "supino-halteres", name: "Supino com Halteres", muscleGroup: "peito", equipment: "Halteres" },
  { id: "crucifixo", name: "Crucifixo", muscleGroup: "peito", equipment: "Halteres" },
  { id: "crossover", name: "Crossover", muscleGroup: "peito", equipment: "Cabo/Polia" },
  { id: "paralelas", name: "Paralelas", muscleGroup: "peito", equipment: "Peso corporal" },
  { id: "flexao", name: "Flexão de Braço", muscleGroup: "peito", equipment: "Peso corporal" },
  { id: "peck-deck", name: "Peck Deck", muscleGroup: "peito", equipment: "Máquina" },

  { id: "puxada-alta", name: "Puxada Alta", muscleGroup: "costas", equipment: "Cabo/Polia" },
  { id: "puxada-triangulo", name: "Puxada Triângulo", muscleGroup: "costas", equipment: "Cabo/Polia" },
  { id: "barra-fixa", name: "Barra Fixa", muscleGroup: "costas", equipment: "Peso corporal" },
  { id: "remada-curvada", name: "Remada Curvada", muscleGroup: "costas", equipment: "Barra" },
  { id: "remada-unilateral", name: "Remada Unilateral", muscleGroup: "costas", equipment: "Halteres" },
  { id: "remada-baixa", name: "Remada Baixa", muscleGroup: "costas", equipment: "Cabo/Polia" },
  { id: "remada-cavalinho", name: "Remada Cavalinho", muscleGroup: "costas", equipment: "Barra" },
  { id: "pulldown", name: "Pulldown", muscleGroup: "costas", equipment: "Cabo/Polia" },
  { id: "levantamento-terra", name: "Levantamento Terra", muscleGroup: "costas", equipment: "Barra" },
  { id: "hiperextensao", name: "Hiperextensão", muscleGroup: "costas", equipment: "Peso corporal" },

  { id: "desenvolvimento-militar", name: "Desenvolvimento Militar", muscleGroup: "ombros", equipment: "Barra" },
  { id: "desenvolvimento-halteres", name: "Desenvolvimento com Halteres", muscleGroup: "ombros", equipment: "Halteres" },
  { id: "elevacao-lateral", name: "Elevação Lateral", muscleGroup: "ombros", equipment: "Halteres" },
  { id: "elevacao-frontal", name: "Elevação Frontal", muscleGroup: "ombros", equipment: "Halteres" },
  { id: "crucifixo-invertido", name: "Crucifixo Invertido", muscleGroup: "ombros", equipment: "Halteres" },
  { id: "encolhimento", name: "Encolhimento", muscleGroup: "ombros", equipment: "Barra" },
  { id: "remada-alta", name: "Remada Alta", muscleGroup: "ombros", equipment: "Barra" },

  { id: "rosca-direta", name: "Rosca Direta", muscleGroup: "biceps", equipment: "Barra" },
  { id: "rosca-alternada", name: "Rosca Alternada", muscleGroup: "biceps", equipment: "Halteres" },
  { id: "rosca-martelo", name: "Rosca Martelo", muscleGroup: "biceps", equipment: "Halteres" },
  { id: "rosca-scott", name: "Rosca Scott", muscleGroup: "biceps", equipment: "Barra" },
  { id: "rosca-concentrada", name: "Rosca Concentrada", muscleGroup: "biceps", equipment: "Halteres" },
  { id: "rosca-cabo", name: "Rosca no Cabo", muscleGroup: "biceps", equipment: "Cabo/Polia" },

  { id: "triceps-corda", name: "Tríceps Corda", muscleGroup: "triceps", equipment: "Cabo/Polia" },
  { id: "triceps-frances", name: "Tríceps Francês", muscleGroup: "triceps", equipment: "Halteres" },
  { id: "triceps-testa", name: "Tríceps Testa", muscleGroup: "triceps", equipment: "Barra" },
  { id: "triceps-banco", name: "Tríceps no Banco", muscleGroup: "triceps", equipment: "Peso corporal" },
  { id: "triceps-barra", name: "Tríceps na Barra", muscleGroup: "triceps", equipment: "Cabo/Polia" },

  { id: "agachamento-livre", name: "Agachamento Livre", muscleGroup: "pernas", equipment: "Barra" },
  { id: "leg-press", name: "Leg Press", muscleGroup: "pernas", equipment: "Máquina" },
  { id: "cadeira-extensora", name: "Cadeira Extensora", muscleGroup: "pernas", equipment: "Máquina" },
  { id: "cadeira-flexora", name: "Cadeira Flexora", muscleGroup: "pernas", equipment: "Máquina" },
  { id: "afundo", name: "Afundo", muscleGroup: "pernas", equipment: "Halteres" },
  { id: "stiff", name: "Stiff", muscleGroup: "pernas", equipment: "Barra" },
  { id: "agachamento-bulgaro", name: "Agachamento Búlgaro", muscleGroup: "pernas", equipment: "Halteres" },
  { id: "hack-machine", name: "Hack Machine", muscleGroup: "pernas", equipment: "Máquina" },
  { id: "mesa-flexora", name: "Mesa Flexora", muscleGroup: "pernas", equipment: "Máquina" },

  { id: "elevacao-pelvica", name: "Elevação Pélvica", muscleGroup: "gluteos", equipment: "Barra" },
  { id: "gluteo-cabo", name: "Glúteo no Cabo", muscleGroup: "gluteos", equipment: "Cabo/Polia" },
  { id: "cadeira-abdutora", name: "Cadeira Abdutora", muscleGroup: "gluteos", equipment: "Máquina" },

  { id: "panturrilha-em-pe", name: "Panturrilha em Pé", muscleGroup: "panturrilha", equipment: "Máquina" },
  { id: "panturrilha-sentado", name: "Panturrilha Sentado", muscleGroup: "panturrilha", equipment: "Máquina" },
  { id: "panturrilha-leg-press", name: "Panturrilha no Leg Press", muscleGroup: "panturrilha", equipment: "Máquina" },

  { id: "abdominal-supra", name: "Abdominal Supra", muscleGroup: "abdomen", equipment: "Peso corporal" },
  { id: "abdominal-infra", name: "Abdominal Infra", muscleGroup: "abdomen", equipment: "Peso corporal" },
  { id: "prancha", name: "Prancha", muscleGroup: "abdomen", equipment: "Peso corporal" },
  { id: "abdominal-cabo", name: "Abdominal no Cabo", muscleGroup: "abdomen", equipment: "Cabo/Polia" },
  { id: "elevacao-pernas", name: "Elevação de Pernas", muscleGroup: "abdomen", equipment: "Peso corporal" },

  { id: "rosca-punho", name: "Rosca de Punho", muscleGroup: "antebraco", equipment: "Barra" },
  { id: "rosca-inversa", name: "Rosca Inversa", muscleGroup: "antebraco", equipment: "Barra" },
];
