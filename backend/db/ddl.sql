create table users
(
    id            integer not null
        constraint users_pk
            primary key autoincrement,
    username      varchar(80)      not null,
    password_salt varchar(50)      not null,
    password_hash varchar(50)
);


create table apps
(
    id          integer not null
        constraint apps_pk
            primary key autoincrement,
    name        varchar(80)      not null,
    public_key  char(36)         not null
        constraint apps_pk2
            unique,
    private_key char(36)         not null
        constraint apps_pk3
            unique,
    owner       integer          not null
        constraint apps_users_id_fk
            references users (id)
            on update cascade on delete cascade
);
