create table sessions
(
    id   char(36)    not null
        constraint sessions_pk
            primary key,
    ip   varchar(40) not null,
    ua   varchar(200) default null,
    lang varchar(50)  default null
);

create table hits
(
    session_id char(36)                          not null
        constraint hits_sessions_id_fk
            references sessions
            on update cascade on delete cascade,
    url        varchar(150)                      not null,
    time       integer default current_timestamp not null
);

create table metrics
(
    time       integer default current_timestamp not null,
    device     varchar(200),
    cpu        integer,
    mem_free   integer,
    mem_total  integer,
    net_up     integer,
    net_down   integer,
    disk_free  integer,
    disk_total integer
);

create table logs
(
    id      integer not null
        constraint logs_pk
            primary key autoincrement,
    message text    not null,
    level   integer not null
);
