create table sessions
(
	id   char(32)    not null
		constraint sessions_pk
			primary key,
	ip   varchar(40) not null,
	ua   varchar(200) default null,
	lang varchar(50)  default null
);

create table hits
(
	session_id char(32)     not null
		constraint hits_sessions_id_fk
			references sessions
			on update cascade on delete cascade,
	url        varchar(150) not null,
	referrer   varchar(150) default null,
	time       integer      not null
);

create table metrics
(
	time       integer not null,
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
	time    integer not null,
	message text    not null,
	level   integer not null
);
