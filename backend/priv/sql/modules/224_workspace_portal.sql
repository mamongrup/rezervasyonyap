-- MODÜL: iş planı görevleri (personel) + portal duyuruları (tedarikçi / acente)
-- Önkoşul: 020_identity_membership, 010_core_tenants

CREATE TABLE staff_workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  due_date DATE,
  remind_at TIMESTAMPTZ,
  assignee_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE staff_workspace_tasks IS 'Yönetici atar; assignee null ise tüm personel görür. Takvim / hatırlatma için due_date ve remind_at.';
COMMENT ON COLUMN staff_workspace_tasks.assignee_user_id IS 'NULL = tüm personel; dolu = yalnız o kullanıcı';

CREATE INDEX idx_staff_workspace_tasks_assignee ON staff_workspace_tasks (assignee_user_id);
CREATE INDEX idx_staff_workspace_tasks_due ON staff_workspace_tasks (due_date);
CREATE INDEX idx_staff_workspace_tasks_status ON staff_workspace_tasks (status);
CREATE INDEX idx_staff_workspace_tasks_created ON staff_workspace_tasks (created_at DESC);

CREATE TABLE portal_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience TEXT NOT NULL CHECK (audience IN ('supplier', 'agency')),
  target_all BOOLEAN NOT NULL DEFAULT TRUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

COMMENT ON TABLE portal_announcements IS 'Yönetici duyurusu; tedarikçi veya acente portalında listelenir.';

CREATE INDEX idx_portal_announcements_audience ON portal_announcements (audience, created_at DESC);

CREATE TABLE portal_announcement_recipients (
  announcement_id UUID NOT NULL REFERENCES portal_announcements (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, organization_id)
);

CREATE INDEX idx_portal_announcement_recipients_org ON portal_announcement_recipients (organization_id);
