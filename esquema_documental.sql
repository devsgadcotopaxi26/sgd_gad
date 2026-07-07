--
-- PostgreSQL database dump
--

\restrict BfyMwBqMGxPibXp3KOHKXbyGEeRCiI28dhsh7lYHTJYJ8kxNBdCkoFmHkaiNAFX

-- Dumped from database version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: func_grabar_archivo(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_grabar_archivo(var_nombre_archivo text, var_archivo_base_64 text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE   
    var_sql text;
    var_md5 text;
    var_tamanio numeric;
    var_arch_codi bigint;
    var_nombre_tabla text;
    var_indi_codi integer;
    var_recordset record;
    arr_tablas text[];
    var_num_tablas integer := 0;
    var_num_tabla_rr integer;
BEGIN
    BEGIN
        var_md5 := md5(var_archivo_base_64);
        SELECT arch_codi from archivo where arch_md5=var_md5 and estado=1 limit 1 INTO var_recordset;
        IF var_recordset is not null THEN return var_recordset.arch_codi; END IF;
       
        FOR var_recordset IN select indi_codi, nombre_tabla from indice where esta_codi = 2 order by indi_codi asc LOOP
            IF arr_tablas is null THEN
                arr_tablas := ARRAY[[var_recordset.indi_codi::text, var_recordset.nombre_tabla]];
            ELSE
                arr_tablas := array_cat(arr_tablas, ARRAY[var_recordset.indi_codi::text, var_recordset.nombre_tabla]);
            END IF;
            var_num_tablas := var_num_tablas + 1;
        END LOOP;
        IF var_num_tablas=0 THEN return 0; END IF;

        var_tamanio := length(var_archivo_base_64)/8*6;
        var_arch_codi := nextval('sec_archivo'::regclass);
       
        -- Calculamos la tabla en la que se va a insertar el registro (tipo round robin) y validamos que esté activa
        var_num_tabla_rr = (var_arch_codi % var_num_tablas) + 1;
        IF NOT func_validar_bloqueo_tabla(arr_tablas[var_num_tabla_rr][2]) THEN
            var_num_tabla_rr := 1;
            WHILE var_num_tabla_rr <= var_num_tablas and NOT func_validar_bloqueo_tabla(arr_tablas[var_num_tabla_rr][2]) LOOP
                var_num_tabla_rr := var_num_tabla_rr + 1;
            END LOOP;
        END IF;
        IF trim(arr_tablas[var_num_tabla_rr][2]) is null THEN return 0; END IF;
        var_nombre_tabla := arr_tablas[var_num_tabla_rr][2];
        var_indi_codi := arr_tablas[var_num_tabla_rr][1];

        var_sql := 'INSERT INTO archivo (arch_codi, indi_codi, nombre, fecha_creacion, tamanio, arch_md5)
                    VALUES ('||var_arch_codi::text||', '||var_indi_codi::text||', '
                             ||quote_literal(var_nombre_archivo)||', now(), '
                             ||var_tamanio::text||', '||quote_literal(var_md5)||')';
        EXECUTE var_sql;
           
        var_sql := 'INSERT INTO '||var_nombre_tabla||' (arch_codi, archivo)
                    VALUES ('||var_arch_codi::text||', '||quote_literal(var_archivo_base_64)||')';
        EXECUTE var_sql;
       
        return var_arch_codi;
    EXCEPTION WHEN OTHERS THEN
        PERFORM func_log_archivo (var_sql, SQLERRM);
        return 0;
    END;
END;
$$;


--
-- Name: func_log_archivo(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_log_archivo(var_sentencia text, var_error text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
    BEGIN
        insert into log_archivo (sentencia, error, fecha) values (var_sentencia, var_error, now());
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error al guardar en el log. %',SQLERRM;
    END;
    return 1;
END;
$$;


--
-- Name: func_recuperar_archivo(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_recuperar_archivo(var_arch_codi bigint) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE	
    var_sql text;
    var_recordset record;
BEGIN
    BEGIN
        SELECT i.nombre_tabla
        FROM archivo a LEFT OUTER JOIN indice i ON a.indi_codi=i.indi_codi
        WHERE a.arch_codi=var_arch_codi
        INTO var_recordset;
        IF var_recordset is null THEN return ''; END IF;
    
        var_sql := 'select archivo from '||coalesce(var_recordset.nombre_tabla,'')||' where arch_codi='||var_arch_codi::text;
        EXECUTE var_sql INTO var_recordset;
        
        RETURN var_recordset.archivo;
    EXCEPTION WHEN OTHERS THEN
        PERFORM func_log_archivo ( quote_literal(var_sql), quote_literal(SQLERRM));
        return '';
    END;
END;
$$;


--
-- Name: func_validar_bloqueo_tabla(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_validar_bloqueo_tabla(var_nombre_tabla text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE	
    var_sql text;
    var_bloqueo record;
BEGIN
    BEGIN
        select mode as tipo_bloqueo from pg_locks 
	where relation=(select relfilenode from pg_class where relname=var_nombre_tabla) 
	    and mode not in ('AccessShareLock','RowShareLock','RowExclusiveLock') limit 1 INTO var_bloqueo;
        IF var_bloqueo is not null THEN 
            var_sql := 'insert into log_bloqueo (tabla, tipo_bloqueo, fecha) values ('||quote_literal(var_nombre_tabla)||', '||quote_literal(var_bloqueo.tipo_bloqueo)||', now());';
            EXECUTE var_sql;
	    RETURN FALSE;
        END IF;
        RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
        PERFORM func_log_archivo (var_sql, SQLERRM);
        RETURN FALSE;
    END;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archivo (
    arch_codi bigint NOT NULL,
    nombre character varying(500),
    fecha_creacion timestamp with time zone,
    tamanio bigint,
    arch_md5 character(32),
    indi_codi integer,
    estado smallint DEFAULT 1
);


--
-- Name: archivo_0001; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archivo_0001 (
    arch_codi bigint NOT NULL,
    archivo character varying
);


--
-- Name: estado_indice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_indice (
    esta_codi smallint NOT NULL,
    nombre character varying(500)
);


--
-- Name: indice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indice (
    indi_codi integer NOT NULL,
    arch_codi_inicio bigint DEFAULT 0,
    arch_codi_fin bigint DEFAULT 0,
    tamanio bigint DEFAULT 0,
    tamanio_maximo bigint DEFAULT 2097152,
    esta_codi smallint DEFAULT 0,
    nombre_tabla character varying(100),
    nombre_tablespace character varying(100),
    fecha_creacion timestamp with time zone DEFAULT now(),
    fecha_activacion timestamp with time zone,
    fecha_cierre timestamp with time zone,
    usua_codi_crea integer,
    usua_codi_activa integer,
    usua_codi_cierra integer
);


--
-- Name: log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log (
    log_id bigint NOT NULL,
    fecha timestamp with time zone,
    usua_codi integer,
    tabla character varying(100),
    sentencia character varying,
    tipo smallint
);


--
-- Name: sec_log_archivo; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_log_archivo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_archivo (
    log_id bigint DEFAULT nextval('public.sec_log_archivo'::regclass) NOT NULL,
    sentencia character varying,
    error character varying,
    fecha timestamp with time zone
);


--
-- Name: sec_log_bloqueo; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_log_bloqueo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_bloqueo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_bloqueo (
    log_id bigint DEFAULT nextval('public.sec_log_bloqueo'::regclass) NOT NULL,
    tabla character varying,
    tipo_bloqueo character varying,
    fecha timestamp with time zone
);


--
-- Name: log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_log_id_seq OWNED BY public.log.log_id;


--
-- Name: log_tiempo_guardar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_tiempo_guardar (
    arch_codi bigint NOT NULL,
    tamanio bigint,
    t1 timestamp without time zone,
    t2 timestamp without time zone,
    t3 timestamp without time zone,
    t4 timestamp without time zone,
    t5 timestamp without time zone,
    t6 timestamp without time zone
);


--
-- Name: sec_archivo; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_archivo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tmp_revertir; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmp_revertir (
    arch_codi bigint NOT NULL
);


--
-- Name: tmp_tiempo_insert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmp_tiempo_insert (
    arch_codi bigint,
    tiempo double precision,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: tmp_tiempo_read; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmp_tiempo_read (
    arch_codi bigint,
    tiempo double precision,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: log log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log ALTER COLUMN log_id SET DEFAULT nextval('public.log_log_id_seq'::regclass);


--
-- Name: archivo pk_archivo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo
    ADD CONSTRAINT pk_archivo PRIMARY KEY (arch_codi);


--
-- Name: archivo_0001 pk_archivo_0001; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_0001
    ADD CONSTRAINT pk_archivo_0001 PRIMARY KEY (arch_codi);


--
-- Name: estado_indice pk_estado_indice; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_indice
    ADD CONSTRAINT pk_estado_indice PRIMARY KEY (esta_codi);


--
-- Name: indice pk_indice; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indice
    ADD CONSTRAINT pk_indice PRIMARY KEY (indi_codi);


--
-- Name: log pk_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT pk_log PRIMARY KEY (log_id);


--
-- Name: log_archivo pk_log_archivo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_archivo
    ADD CONSTRAINT pk_log_archivo PRIMARY KEY (log_id);


--
-- Name: log_bloqueo pk_log_bloqueo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_bloqueo
    ADD CONSTRAINT pk_log_bloqueo PRIMARY KEY (log_id);


--
-- Name: log_tiempo_guardar pk_log_tiemp_grabar; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_tiempo_guardar
    ADD CONSTRAINT pk_log_tiemp_grabar PRIMARY KEY (arch_codi);


--
-- Name: tmp_revertir pk_tmp_revertir; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmp_revertir
    ADD CONSTRAINT pk_tmp_revertir PRIMARY KEY (arch_codi);


--
-- Name: idx_archivo_md5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_archivo_md5 ON public.archivo USING btree (arch_md5);


--
-- Name: archivo_0001 fk_archivo_0001; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_0001
    ADD CONSTRAINT fk_archivo_0001 FOREIGN KEY (arch_codi) REFERENCES public.archivo(arch_codi);


--
-- Name: indice fk_indice_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indice
    ADD CONSTRAINT fk_indice_01 FOREIGN KEY (esta_codi) REFERENCES public.estado_indice(esta_codi);


--
-- PostgreSQL database dump complete
--

\unrestrict BfyMwBqMGxPibXp3KOHKXbyGEeRCiI28dhsh7lYHTJYJ8kxNBdCkoFmHkaiNAFX

