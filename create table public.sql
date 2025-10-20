create table public.users
(
    id          uuid                     default uuid_generate_v4() not null
        primary key,
    keycloak_id varchar(255)                                        not null
        unique,
    email       varchar(255)                                        not null
        unique,
    first_name  varchar(100),
    last_name   varchar(100),
    created_at  timestamp with time zone default now(),
    updated_at  timestamp with time zone default now(),
    is_active   boolean                  default true
);

alter table public.users
    owner to pm_user;

create index idx_users_keycloak_id
    on public.users (keycloak_id);

create index idx_users_email
    on public.users (email);

create table public.roles
(
    id          uuid                     default uuid_generate_v4() not null
        primary key,
    name        varchar(50)                                         not null
        unique,
    description text,
    created_at  timestamp with time zone default now()
);

alter table public.roles
    owner to pm_user;

create table public.user_roles
(
    id          uuid                     default uuid_generate_v4() not null
        primary key,
    user_id     uuid                                                not null
        references public.users
            on delete cascade,
    role_id     uuid                                                not null
        references public.roles
            on delete cascade,
    assigned_at timestamp with time zone default now(),
    unique (user_id, role_id)
);

alter table public.user_roles
    owner to pm_user;

create index idx_user_roles_user_id
    on public.user_roles (user_id);

create index idx_user_roles_role_id
    on public.user_roles (role_id);

create table public.customers
(
    id            uuid                     default uuid_generate_v4() not null
        primary key,
    customer_name varchar(255)                                        not null,
    created_at    timestamp with time zone default now(),
    updated_at    timestamp with time zone default now(),
    type          varchar(32)              default 'Kunde'::character varying,
    customer_code varchar(32)                                         not null
        constraint customers_pk
            unique
);

comment on table public.customers is 'Customer information for project tracking';

comment on column public.customers.id is 'Unique identifier for the customer';

comment on column public.customers.customer_name is 'Name of the customer';

alter table public.customers
    owner to pm_user;

create index idx_customers_name
    on public.customers (customer_name);

create index customers_customer_code_index
    on public.customers (customer_code);

create table public.orders
(
    id          uuid                     default uuid_generate_v4() not null
        primary key,
    created_at  timestamp with time zone default now(),
    updated_at  timestamp with time zone default now(),
    order_id    varchar(32),
    description varchar(255),
    comment     text,
    customer_id uuid                                                not null
        constraint orders_customers_id_fk
            references public.customers
);

comment on table public.orders is 'Orders linked to projects';

comment on column public.orders.id is 'Unique identifier for the order';

alter table public.orders
    owner to pm_user;

create table public.projects
(
    id          uuid                     default uuid_generate_v4() not null
        primary key,
    name        varchar(255)                                        not null,
    description text,
    owner_id    uuid                                                not null
        references public.users,
    status      varchar(20)              default 'active'::character varying
        constraint projects_status_check
            check ((status)::text = ANY
                   ((ARRAY ['active'::character varying, 'completed'::character varying, 'archived'::character varying])::text[])),
    start_date  date,
    end_date    date,
    created_at  timestamp with time zone default now(),
    updated_at  timestamp with time zone default now(),
    customer_id uuid                                                not null
        references public.customers,
    order_id    uuid                                                not null
        constraint projects_orders_id_fk
            references public.orders
);

alter table public.projects
    owner to pm_user;

create index idx_projects_owner
    on public.projects (owner_id);

create index idx_projects_status
    on public.projects (status);

create index idx_projects_customer
    on public.projects (customer_id);

create table public.project_members
(
    id         uuid                     default uuid_generate_v4() not null
        primary key,
    project_id uuid                                                not null
        references public.projects
            on delete cascade,
    user_id    uuid                                                not null
        references public.users
            on delete cascade,
    role       varchar(50)              default 'member'::character varying,
    joined_at  timestamp with time zone default now(),
    unique (project_id, user_id)
);

alter table public.project_members
    owner to pm_user;

create index idx_project_members_project_id
    on public.project_members (project_id);

create index idx_project_members_user_id
    on public.project_members (user_id);

create table public.task_properties
(
    id uuid default uuid_generate_v4() not null
);

alter table public.task_properties
    owner to pm_user;

create table public.item_properties
(
    id       uuid                  not null
        constraint item_properties_pk
            primary key,
    external boolean default false not null
);

alter table public.item_properties
    owner to pm_user;

create table public.items
(
    id              uuid default uuid_generate_v4() not null
        constraint items_pk
            primary key,
    order_id        uuid                            not null
        constraint items_orders_id_fk
            references public.orders
            on delete cascade,
    price_per_unit  real,
    units           integer,
    description     varchar(255),
    comment         text,
    material_number varchar(255),
    properties_id   uuid
        constraint items_item_properties_id_fk
            references public.item_properties,
    line_num        integer
);

alter table public.items
    owner to pm_user;

create table public.tasks
(
    id              uuid                     default uuid_generate_v4() not null
        primary key,
    project_id      uuid                                                not null
        references public.projects
            on delete cascade,
    title           varchar(255)                                        not null,
    description     text,
    assigned_to     uuid
        references public.users,
    created_by      uuid                                                not null
        references public.users,
    status          varchar(20)              default 'todo'::character varying
        constraint tasks_status_check
            check ((status)::text = ANY
                   ((ARRAY ['todo'::character varying, 'in_progress'::character varying, 'review'::character varying, 'done'::character varying])::text[])),
    priority        varchar(10)              default 'medium'::character varying
        constraint tasks_priority_check
            check ((priority)::text = ANY
                   ((ARRAY ['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])),
    estimated_hours numeric(5, 2),
    due_date        timestamp with time zone,
    created_at      timestamp with time zone default now(),
    updated_at      timestamp with time zone default now(),
    item_id         uuid                                                not null
        constraint tasks_items__fk
            references public.items,
    external        boolean                  default false              not null,
    billable        boolean                  default true               not null
);

alter table public.tasks
    owner to pm_user;

create index idx_tasks_project
    on public.tasks (project_id);

create index idx_tasks_assigned_to
    on public.tasks (assigned_to);

create index idx_tasks_status
    on public.tasks (status);

create index tasks_item_id_index
    on public.tasks (item_id);

create table public.time_entries
(
    id               uuid                     default uuid_generate_v4() not null
        primary key,
    user_id          uuid                                                not null
        references public.users
            on delete cascade,
    task_id          uuid                                                not null
        references public.tasks
            on delete cascade,
    project_id       uuid                                                not null
        references public.projects
            on delete cascade,
    description      text,
    start_time       timestamp with time zone                            not null,
    end_time         timestamp with time zone,
    duration_minutes integer,
    is_running       boolean                  default false,
    created_at       timestamp with time zone default now(),
    updated_at       timestamp with time zone default now(),
    external         boolean                  default false              not null,
    billable         boolean                  default true               not null,
    constraint check_single_running
        exclude using gist (user_id with =, tstzrange(start_time,
                                                      COALESCE(end_time, 'infinity'::timestamp with time zone),
                                                      '[)'::text) with &&),
    constraint check_time_order
        check ((end_time IS NULL) OR (end_time > start_time))
);

alter table public.time_entries
    owner to pm_user;

create index idx_time_entries_user
    on public.time_entries (user_id);

create index idx_time_entries_task
    on public.time_entries (task_id);

create index idx_time_entries_project
    on public.time_entries (project_id);

create index idx_time_entries_start_time
    on public.time_entries (start_time);

create index idx_time_entries_running
    on public.time_entries (user_id, is_running)
    where (is_running = true);

create table public.comments
(
    id         uuid                     default uuid_generate_v4() not null
        primary key,
    task_id    uuid                                                not null
        references public.tasks
            on delete cascade,
    user_id    uuid                                                not null
        references public.users
            on delete cascade,
    content    text                                                not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table public.comments
    owner to pm_user;

create index idx_comments_task
    on public.comments (task_id);

create index idx_items_order
    on public.items (order_id);

create table public.notifications
(
    id                 uuid                     default uuid_generate_v4() not null
        primary key,
    user_id            uuid                                                not null
        references public.users
            on delete cascade,
    type               notification_type                                   not null,
    title              varchar(200)                                        not null,
    message            varchar(1000)                                       not null,
    is_read            boolean                  default false              not null,
    related_task_id    uuid
        references public.tasks
            on delete cascade,
    related_project_id uuid
        references public.projects
            on delete cascade,
    related_comment_id uuid
        references public.comments
            on delete cascade,
    actor_id           uuid
                                                                           references public.users
                                                                               on delete set null,
    created_at         timestamp with time zone default now(),
    read_at            timestamp with time zone
);

comment on table public.notifications is 'User notifications for task assignments, comments, and other events';

comment on column public.notifications.id is 'Unique identifier for the notification';

comment on column public.notifications.user_id is 'User who receives the notification';

comment on column public.notifications.type is 'Type of notification (task_assigned, comment_added, etc.)';

comment on column public.notifications.title is 'Short notification title';

comment on column public.notifications.message is 'Detailed notification message';

comment on column public.notifications.is_read is 'Whether the notification has been read';

comment on column public.notifications.related_task_id is 'Optional reference to related task';

comment on column public.notifications.related_project_id is 'Optional reference to related project';

comment on column public.notifications.related_comment_id is 'Optional reference to related comment';

comment on column public.notifications.actor_id is 'User who triggered the notification';

comment on column public.notifications.read_at is 'Timestamp when notification was marked as read';

alter table public.notifications
    owner to pm_user;

create index idx_notifications_user
    on public.notifications (user_id);

create index idx_notifications_user_unread
    on public.notifications (user_id, is_read)
    where (is_read = false);

create index idx_notifications_type
    on public.notifications (type);

create index idx_notifications_created_at
    on public.notifications (created_at desc);

create index idx_notifications_task
    on public.notifications (related_task_id)
    where (related_task_id IS NOT NULL);

create index idx_notifications_project
    on public.notifications (related_project_id)
    where (related_project_id IS NOT NULL);

create index idx_notifications_actor
    on public.notifications (actor_id)
    where (actor_id IS NOT NULL);

