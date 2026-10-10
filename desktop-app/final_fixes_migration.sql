-- Migration to add last_status_reason and update constraints/triggers for Rework/Reject

-- 1. Add last_status_reason to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS last_status_reason TEXT;

-- 2. Update status transitions to allow any transition to 'open' (for rework) 
--    and to 'closed' (for reject).
CREATE OR REPLACE FUNCTION public.enforce_ticket_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_allowed TEXT[];
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_allowed := CASE OLD.status
    WHEN 'open' THEN ARRAY['acknowledged', 'assigned', 'in_progress', 'closed']::TEXT[]
    WHEN 'acknowledged' THEN ARRAY['assigned', 'in_progress', 'open', 'closed']::TEXT[]
    WHEN 'assigned' THEN ARRAY['scheduled', 'in_progress', 'open', 'closed']::TEXT[]
    WHEN 'scheduled' THEN ARRAY['in_progress', 'work_completed', 'resolved', 'open', 'closed']::TEXT[]
    WHEN 'in_progress' THEN ARRAY['work_completed', 'resolved', 'closed', 'open']::TEXT[]
    WHEN 'work_completed' THEN ARRAY['resolved', 'in_progress', 'open', 'closed']::TEXT[]
    WHEN 'resolved' THEN ARRAY['closed', 'in_progress', 'open']::TEXT[]
    WHEN 'closed' THEN ARRAY['open', 'in_progress']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

  IF NEW.status = ANY(v_allowed) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid ticket status transition from % to %.', OLD.status, NEW.status;
END;
$$;

-- 3. Update the notification trigger to use last_status_reason for Rework and Reject
CREATE OR REPLACE FUNCTION public.notify_ticket_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_type TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF NEW.deleted_at IS NULL
     AND NEW.assigned_staff_id IS NOT NULL
     AND NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.assigned_staff_id,
      'ticket_assigned',
      'Ticket assigned to you: ' || NEW.ticket_number,
      NEW.subject,
      'ticket',
      NEW.id
    );
  END IF;

  IF NEW.deleted_at IS NULL THEN
    v_message := NEW.subject;
    v_type := NULL;

    -- Resident answered "Not Yet" on work completed. Notify staff, super
    -- admins, and the assigned meter reader — not the resident who reported it.
    IF OLD.status = 'work_completed' AND NEW.status = 'in_progress' THEN
      v_title := 'Work not yet completed: ' || NEW.ticket_number;
      IF NEW.last_status_reason IS NOT NULL AND btrim(NEW.last_status_reason) <> '' THEN
        v_message := 'Resident reported that work is not yet completed: ' || btrim(NEW.last_status_reason);
      ELSE
        v_message := 'Resident reported that work is not yet completed. ' || COALESCE(NEW.subject, '');
      END IF;

      INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
      SELECT DISTINCT
        p.id,
        'ticket_status',
        v_title,
        v_message,
        'ticket',
        NEW.id
      FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
      WHERE p.is_active = TRUE
        AND p.id IS DISTINCT FROM NEW.resident_id
        AND (
          r.name IN ('staff', 'super_admin')
          OR p.id = NEW.assigned_staff_id
          OR EXISTS (
            SELECT 1
            FROM public.ticket_assignees ta
            WHERE ta.ticket_id = NEW.id
              AND ta.profile_id = p.id
          )
        );

    -- Handle explicit rejection
    ELSIF NEW.status = 'closed' AND OLD.status IN ('open', 'acknowledged', 'assigned', 'scheduled', 'in_progress') THEN
      v_type := 'ticket_rejected';
      v_title := 'Ticket Not Accepted';
      IF NEW.last_status_reason IS NOT NULL AND NEW.last_status_reason <> '' THEN
         v_message := 'Your ticket ' || NEW.ticket_number || ' was not accepted. Reason: ' || NEW.last_status_reason;
      ELSE
         v_message := 'Your ticket ' || NEW.ticket_number || ' was not accepted. Please review the ticket for details.';
      END IF;

    -- Handle explicit rework
    ELSIF NEW.last_status_reason IS DISTINCT FROM OLD.last_status_reason AND NEW.last_status_reason IS NOT NULL AND NEW.status IN ('open', 'in_progress') THEN
      v_type := 'ticket_needs_action';
      v_title := 'Ticket Needs Action';
      v_message := 'Your ticket ' || NEW.ticket_number || ' requires additional information: ' || NEW.last_status_reason;

    -- Handle regular status changes
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'resolved' THEN
        v_type := 'ticket_resolved';
        v_title := 'Ticket ' || NEW.ticket_number || ' has been resolved';
      ELSIF NEW.status = 'work_completed' THEN
        v_type := 'ticket_status';
        v_title := 'Please confirm: is the work on ticket ' || NEW.ticket_number || ' completed?';
      ELSE
        v_type := 'ticket_status';
        v_title := 'Ticket ' || NEW.ticket_number || ' is now ' || replace(NEW.status, '_', ' ');
      END IF;
    END IF;

    IF v_type IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
      VALUES (
        NEW.resident_id,
        v_type,
        v_title,
        v_message,
        'ticket',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
