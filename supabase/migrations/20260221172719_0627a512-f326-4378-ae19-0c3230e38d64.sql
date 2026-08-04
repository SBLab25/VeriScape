
-- Fix search_path for security
CREATE OR REPLACE FUNCTION public.calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(0.5 + SQRT(1 + 8.0 * xp / 100) / 2)::INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_recommended_difficulty(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_level INTEGER;
  v_success REAL;
BEGIN
  SELECT current_level, success_rate INTO v_level, v_success
  FROM public.user_quest_stats WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN 'easy'; END IF;
  IF v_level >= 15 AND v_success >= 0.7 THEN RETURN 'legendary';
  ELSIF v_level >= 8 AND v_success >= 0.6 THEN RETURN 'hard';
  ELSIF v_level >= 3 AND v_success >= 0.5 THEN RETURN 'medium';
  ELSE RETURN 'easy';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_level := public.calculate_level(NEW.total_xp);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
