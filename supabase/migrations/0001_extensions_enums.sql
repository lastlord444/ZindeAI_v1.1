-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Definitions
CREATE TYPE public.meal_type AS ENUM (
    'kahvalti',
    'ara_ogun_1',
    'ogle',
    'ara_ogun_2',
    'aksam',
    'gece_atistirmasi'
);

CREATE TYPE public.goal_tag AS ENUM (
    'cut',
    'bulk',
    'maintain'
);

CREATE TYPE public.meal_class AS ENUM (
    'breakfast',
    'light_snack',
    'main_meal',
    'night_snack'
);
