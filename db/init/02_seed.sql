-- db/init/02_seed.sql
BEGIN;

INSERT INTO technicians (id, name, trade) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ava Tech', 'appliance'),
  ('22222222-2222-2222-2222-222222222222', 'Ben Tech', 'plumbing');

INSERT INTO users (id, email, display_name, role, technician_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dispatcher@demo.local', 'Demo Dispatcher', 'dispatcher', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ava@demo.local', 'Ava (Tech)', 'technician', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ben@demo.local', 'Ben (Tech)', 'technician', '22222222-2222-2222-2222-222222222222'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'client1@demo.local', 'Client One', 'client', NULL),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'client2@demo.local', 'Client Two', 'client', NULL);

INSERT INTO clients (user_id, default_phone, default_service_address) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '555-1001', '11 Client Way, Springfield'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '555-1002', '22 Client Way, Springfield');

INSERT INTO auth_tokens (token, user_id) VALUES
  ('demo-dispatcher-token', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('demo-ava-token', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('demo-ben-token', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('demo-client-1-token', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('demo-client-2-token', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');

INSERT INTO jobs (
  id, title, description, customer_name, customer_phone, address,
  appointment_start, appointment_end, current_status,
  assigned_technician_id, requested_by_user_id, created_by_user_id
) VALUES
  (
    '99999999-0000-0000-0000-000000000001',
    'Dishwasher not draining',
    'Standing water after cycle.',
    'Jordan Lee', '555-0101', '123 Main St, Springfield',
    now() + interval '2 hours', now() + interval '3 hours',
    'scheduled',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '99999999-0000-0000-0000-000000000002',
    'Leaky kitchen sink',
    'Leak under P-trap.',
    'Casey Kim', '555-0102', '500 Elm St, Springfield',
    now() - interval '30 minutes', now() + interval '30 minutes',
    'on_my_way',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '99999999-0000-0000-0000-000000000003',
    'Washer making loud noise',
    'Spin cycle vibration.',
    'Sam Patel', '555-0103', '88 Oak Ave, Springfield',
    now() - interval '2 hours', now() - interval '1 hour',
    'completed',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  );

INSERT INTO job_events (job_id, event_type, actor_user_id, metadata) VALUES
  ('99999999-0000-0000-0000-000000000001', 'CREATED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"source":"dispatcher"}'),
  ('99999999-0000-0000-0000-000000000002', 'CREATED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"source":"dispatcher"}'),
  ('99999999-0000-0000-0000-000000000003', 'CREATED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"source":"dispatcher"}');

INSERT INTO job_events (job_id, event_type, old_status, new_status, actor_user_id) VALUES
  ('99999999-0000-0000-0000-000000000002', 'STATUS_CHANGED', 'scheduled', 'on_my_way', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('99999999-0000-0000-0000-000000000003', 'STATUS_CHANGED', 'on_site', 'completed', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

COMMIT;
