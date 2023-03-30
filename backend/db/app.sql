create table clients
(
	id   char(32) not null
		constraint clients_pk
			primary key,
	ua   varchar(200) default null,
	lang varchar(50)  default null
);

create table hits
(
	id        integer      not null
		constraint hits_pk
			primary key autoincrement,
	time      integer      not null,
	client_id char(32)     not null
		constraint hits_clients_id_fk
			references clients
			on update cascade on delete cascade,
	url       varchar(150) not null,
	referrer  varchar(150) default null
);

create table client_logs
(
	id      integer not null
		constraint client_logs_pk
			primary key autoincrement,
	time    integer not null,
	tag     text,
	message text    not null,
	level   integer not null
);

create table server_logs
(
	id      integer not null
		constraint server_logs_pk
			primary key autoincrement,
	time    integer not null,
	tag     text,
	message text    not null,
	level   integer not null
);

create table feedback
(
	id      integer not null
		constraint feedback_pk
			primary key autoincrement,
	time    integer not null,
	message text    not null
);

create table metrics
(
	id         integer not null
		constraint metrics_pk
			primary key autoincrement,
	time       integer not null,
	device     varchar(200),
	cpu        integer,
	mem_used   integer,
	mem_total  integer,
	net_up     integer,
	net_down   integer,
	disk_used  integer,
	disk_total integer
);
