--
-- PostgreSQL database dump
--

\restrict I1FhfWrsIRQ5vz9XvP059006LegAdqyjB3TL6EXKMOv1ZD50JtRynnANOL8wcPi

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
-- Name: pg_buffercache; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_buffercache WITH SCHEMA public;


--
-- Name: EXTENSION pg_buffercache; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_buffercache IS 'examine the shared buffer cache';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: concat(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.concat(text, text) RETURNS text
    LANGUAGE sql
    AS $_$select case when $1 = '' then $2 else ($1 || ', ' || $2) end$_$;


--
-- Name: FUNCTION concat(text, text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.concat(text, text) IS 'Concatena dos cadenas de texto';


--
-- Name: crear_lista_usuarios_institucion(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_lista_usuarios_institucion(text, text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    fila RECORD;
    numero integer;
Begin
    numero := 1;
    execute E'delete from lista_usuarios where lista_codi='||$2;
    BEGIN
        for fila in execute E'select usua_codi from usuarios where inst_codi='||$1||' and usua_esta=1 order by usua_apellido' loop
            execute E'insert into lista_usuarios (lista_codi, usua_codi, orden) values ('||$2||','||fila.usua_codi||','||numero||')';
            numero := numero + 1;
         end loop;
    EXCEPTION WHEN OTHERS THEN
        return 'Error';
    END;
    return 'OK';
end;
$_$;


--
-- Name: FUNCTION crear_lista_usuarios_institucion(text, text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.crear_lista_usuarios_institucion(text, text) IS 'Añade todos los usuarios de una institución a una lista.
Parámetros: Id de la institución, Id de la lista';


--
-- Name: func_actualizar_view_usuario_ciudad(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_actualizar_view_usuario_ciudad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ 
DECLARE 
BEGIN 
    BEGIN 
        UPDATE usuario SET usua_ciudad=NEW.nombre WHERE ciu_codi=NEW.id; 
    EXCEPTION WHEN OTHERS THEN 
        INSERT INTO log_view_usuario (fecha, tabla, accion, codigo, error) VALUES (now(), 'ciudad', TG_OP, NEW.id, SQLERRM); 
    END; 
    RETURN NULL; 
END; 
$$;


--
-- Name: func_actualizar_view_usuario_ciudadano(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_actualizar_view_usuario_ciudadano() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    var_usua_codi integer;
BEGIN
    BEGIN
        IF TG_OP = 'DELETE' THEN -- Cuando se pasa un ciudadano a la tabla funcionario (ciudadanos con firma electrónica)
            var_usua_codi := OLD.ciu_codigo;
	    DELETE FROM usuario WHERE usua_codi=OLD.ciu_codigo;
	END IF;
	
        IF TG_OP = 'UPDATE' THEN
            var_usua_codi := OLD.ciu_codigo;
	    UPDATE usuario 
	    SET   usua_cedula = NEW.ciu_cedula
	        , usua_nomb   = NEW.ciu_nombre
	        , usua_apellido = NEW.ciu_apellido
	        , usua_nombre = TRIM(COALESCE(NEW.ciu_nombre::text, ''::text) || ' '::text || COALESCE(NEW.ciu_apellido::text, ''::text))
	        , usua_nuevo  = NEW.ciu_nuevo 
	        , usua_login  = CASE WHEN NEW.ciu_estado=1 THEN 'U'::text || NEW.ciu_cedula::text ELSE 'l'::text || OLD.ciu_codigo::text END
	        , usua_pasw   = NEW.ciu_pasw 
	        , usua_esta   = NEW.ciu_estado
	        , usua_cargo  = NEW.ciu_cargo
	        , usua_cargo_cabecera = NEW.ciu_cargo
	        , usua_email  = NEW.ciu_email
	        , usua_titulo = NEW.ciu_titulo
	        , usua_abr_titulo = NEW.ciu_abr_titulo
	        , inst_nombre = NEW.ciu_empresa
	        , usua_direccion = NEW.ciu_direccion
	        , usua_telefono = NEW.ciu_telefono
	        , ciu_codi = COALESCE(NEW.ciudad_codi, 1)
	        , usua_ciudad = (SELECT c.nombre FROM ciudad c WHERE COALESCE(NEW.ciudad_codi, 1) = c.id)
	        , cargo_tipo  = 0
	        , depe_codi   = 0 
	        , depe_nomb   = ''
	        , dep_sigla = NULL
	        , inst_codi   = 0
	        , inst_sigla  = ''
	        , inst_estado = 1
	        , tipo_usuario = 2
	        , usua_tipo_certificado = 0
	        , usua_subrogado = 0
	        , visible_sub = 0
	        , usua_firma_path = ''
                , usua_datos = translate(UPPER(coalesce(NEW.ciu_cedula,'')||' '||coalesce(NEW.ciu_nombre,'')
                  ||' '||coalesce(NEW.ciu_apellido,'')||' '||coalesce(NEW.ciu_cargo,'')||' '||coalesce(NEW.ciu_email,'')
                  ||' '||coalesce(NEW.ciu_empresa,'')),'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ','AEIOUAEIOUAEIOUAEIOUAON')
                , inst_adscrita = 0
                , inst_padre_nombre = 'Ciudadanos'
                , inst_padre_sigla = 'CIUDADANO'
	    WHERE usua_codi = OLD.ciu_codigo;
	END IF;

        IF TG_OP = 'INSERT' THEN
            var_usua_codi := NEW.ciu_codigo;
	    INSERT INTO usuario (
	        usua_codi, usua_cargo, usua_cargo_cabecera, usua_nuevo, usua_login, usua_pasw, usua_esta, usua_cedula, usua_nomb, usua_apellido, usua_nombre
	         , usua_email, usua_titulo, usua_abr_titulo, inst_nombre, usua_direccion, usua_telefono, ciu_codi, usua_ciudad
	         , cargo_tipo, depe_codi, inst_estado, inst_codi, depe_nomb, inst_sigla, tipo_usuario, usua_tipo_certificado
	         , usua_subrogado, visible_sub, dep_sigla, usua_firma_path, usua_datos, inst_adscrita, inst_padre_nombre, inst_padre_sigla
	    ) VALUES (
	        NEW.ciu_codigo, NEW.ciu_cargo, NEW.ciu_cargo, NEW.ciu_nuevo
	        , CASE WHEN NEW.ciu_estado=1 THEN 'U'::text || NEW.ciu_cedula::text ELSE 'l'::text || NEW.ciu_codigo::text END
	        , NEW.ciu_pasw, NEW.ciu_estado, NEW.ciu_cedula, NEW.ciu_nombre, NEW.ciu_apellido
	        , TRIM(COALESCE(NEW.ciu_nombre::text, ''::text) || ' '::text || COALESCE(NEW.ciu_apellido::text, ''::text))
	        , NEW.ciu_email, NEW.ciu_titulo, NEW.ciu_abr_titulo, NEW.ciu_empresa, NEW.ciu_direccion, NEW.ciu_telefono
	        , COALESCE(NEW.ciudad_codi, 1), (SELECT c.nombre FROM ciudad c WHERE COALESCE(NEW.ciudad_codi, 1) = c.id)
	        , 0, 0, 1, 0, '', '', 2, 0, 0, 0, NULL, ''
	        , translate(UPPER(coalesce(NEW.ciu_cedula,'')||' '||coalesce(NEW.ciu_nombre,'')
                    ||' '||coalesce(NEW.ciu_apellido,'')||' '||coalesce(NEW.ciu_cargo,'')||' '||coalesce(NEW.ciu_email,'')
                    ||' '||coalesce(NEW.ciu_empresa,'')),'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ','AEIOUAEIOUAEIOUAEIOUAON')
                , 0, 'Ciudadanos', 'CIUDADANO'
	    );
	END IF;

    EXCEPTION WHEN OTHERS THEN
        INSERT INTO log_view_usuario (fecha, tabla, accion, codigo, error) VALUES (now(), 'ciudadano', TG_OP, var_usua_codi, SQLERRM);
    END;
    RETURN NULL;
END;
$$;


--
-- Name: func_actualizar_view_usuario_dependencia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_actualizar_view_usuario_dependencia() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    var_recordset record;
BEGIN
    BEGIN
        -- Consultamos los datos de la institucion adscrita
        SELECT inst_nombre, inst_sigla FROM institucion where inst_codi=NEW.inst_adscrita INTO var_recordset;

        UPDATE usuario 
        SET   depe_nomb=NEW.depe_nomb
            , dep_sigla=NEW.dep_sigla 
            , inst_adscrita=NEW.inst_adscrita
            , inst_nombre = var_recordset.inst_nombre
            , inst_sigla = var_recordset.inst_sigla
            , usua_datos = translate(UPPER(coalesce(usua_cedula,'')||' '||coalesce(usua_nombre,'')||' '||coalesce(usua_cargo,'')
                  ||' '||coalesce(usua_email,'')||' '||coalesce(NEW.depe_nomb,'')
                  ||' '||coalesce(var_recordset.inst_nombre,'')||' '||coalesce(var_recordset.inst_sigla,'')
              ),'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ','AEIOUAEIOUAEIOUAEIOUAON')
        WHERE depe_codi = NEW.depe_codi;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO log_view_usuario (fecha, tabla, accion, codigo, error) VALUES (now(), 'dependencia', TG_OP, NEW.depe_codi, SQLERRM);
    END;
    RETURN NULL;
END;
$$;


--
-- Name: func_actualizar_view_usuario_institucion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_actualizar_view_usuario_institucion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
    BEGIN
        UPDATE usuario 
        SET   
            -- Si modifico la institución padre
              inst_estado=case when inst_codi=NEW.inst_codi then NEW.inst_estado else inst_estado end
            , inst_padre_nombre=case when inst_codi=NEW.inst_codi then NEW.inst_nombre else inst_padre_nombre end
            , inst_padre_sigla=case when inst_codi=NEW.inst_codi then NEW.inst_sigla else inst_padre_sigla end
            -- Si modifico la institución adscrita
            , inst_nombre=case when inst_adscrita=NEW.inst_codi then NEW.inst_nombre else inst_nombre end
            , inst_sigla=case when inst_adscrita=NEW.inst_codi then NEW.inst_sigla else inst_sigla end
            , usua_datos = translate(UPPER(coalesce(usua_cedula,'')||' '||coalesce(usua_nombre,'')||' '||coalesce(usua_cargo,'')
                  ||' '||coalesce(usua_email,'')||' '||coalesce(depe_nomb,'')||' '||
                  case when inst_adscrita=NEW.inst_codi then coalesce(NEW.inst_nombre,'')||' '||coalesce(NEW.inst_sigla,'') 
                       else coalesce(inst_nombre,'')||' '||coalesce(inst_sigla,'') end
              ),'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ','AEIOUAEIOUAEIOUAEIOUAON')
        WHERE inst_codi = NEW.inst_codi or inst_adscrita=NEW.inst_codi;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO log_view_usuario (fecha, tabla, accion, codigo, error) VALUES (now(), 'institucion', TG_OP, NEW.depe_codi, SQLERRM);
    END;
    RETURN NULL;
END;
$$;


--
-- Name: func_actualizar_view_usuario_usuarios(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_actualizar_view_usuario_usuarios() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    var_recordset record;
BEGIN
    BEGIN
        -- Consultamos los datos de la institucion, del área y de la ciudad para insertarlos luego
        SELECT u.usua_codi, d.depe_nomb, d.dep_sigla, i.inst_estado, ia.inst_sigla
            , CASE WHEN i.inst_codi = 1 THEN NEW.inst_nombre ELSE ia.inst_nombre END AS inst_nombre
            , d.inst_adscrita, i.inst_sigla as inst_padre_sigla, i.inst_nombre as inst_padre_nombre
            , COALESCE(NEW.ciu_codi, COALESCE(d.depe_pie1,'1')::integer) AS ciu_codi
	    , (SELECT c.nombre FROM ciudad c WHERE COALESCE(NEW.ciu_codi, COALESCE(d.depe_pie1,'1')::integer)=c.id) AS usua_ciudad
	FROM (SELECT NEW.usua_codi as usua_codi, coalesce(NEW.inst_codi,0) as inst_codi, coalesce(NEW.depe_codi,0) as depe_codi) as u
            LEFT JOIN dependencia d ON u.depe_codi = d.depe_codi
            LEFT JOIN institucion i ON u.inst_codi = i.inst_codi --institucion padre
            LEFT JOIN institucion ia ON d.inst_adscrita = ia.inst_codi --institucion adscrita
        INTO var_recordset;
        
    
        IF TG_OP = 'UPDATE' THEN
	    UPDATE usuario 
	    SET   usua_cedula = NEW.usua_cedula
	        , usua_nomb   = NEW.usua_nomb
	        , usua_apellido = NEW.usua_apellido
	        , usua_nombre = TRIM(COALESCE(NEW.usua_nomb::text, ''::text) || ' '::text || COALESCE(NEW.usua_apellido::text, ''::text))
	        , usua_nuevo  = NEW.usua_nuevo 
	        , usua_login  = NEW.usua_login
	        , usua_pasw   = NEW.usua_pasw 
	        , usua_cargo  = NEW.usua_cargo 
	        , usua_cargo_cabecera = NEW.usua_cargo_cabecera
	        , cargo_tipo  = NEW.cargo_tipo
	        , usua_esta   = NEW.usua_esta
	        , usua_email  = NEW.usua_email
	        , usua_titulo = NEW.usua_titulo
	        , usua_abr_titulo = NEW.usua_abr_titulo
	        , tipo_usuario = CASE WHEN NEW.inst_codi = 1 THEN 2 ELSE 1 END
	        , usua_tipo_certificado = NEW.usua_tipo_certificado
	        , usua_subrogado = NEW.usua_subrogado
	        , visible_sub = NEW.visible_sub
	        , usua_direccion = NEW.usua_direccion
	        , usua_telefono = NEW.usua_telefono
	        , usua_firma_path = NEW.usua_firma_path
	        , depe_codi   = NEW.depe_codi
	        , depe_nomb   = var_recordset.depe_nomb
	        , dep_sigla   = var_recordset.dep_sigla
	        , inst_codi   = NEW.inst_codi
	        , inst_nombre = var_recordset.inst_nombre
	        , inst_sigla  = var_recordset.inst_sigla
	        , inst_estado = var_recordset.inst_estado
	        , ciu_codi = var_recordset.ciu_codi
	        , usua_ciudad = var_recordset.usua_ciudad
                , tipo_identificacion = NEW.tipo_identificacion
                , usua_datos = translate(UPPER(coalesce(NEW.usua_cedula,'')||' '||coalesce(NEW.usua_nomb,'')
                      ||' '||coalesce(NEW.usua_apellido,'')||' '||coalesce(NEW.usua_cargo,'')||' '||coalesce(NEW.usua_email,'')
                      ||' '||coalesce(var_recordset.depe_nomb,'')||' '||coalesce(var_recordset.inst_nombre,'')
                      ||' '||coalesce(var_recordset.inst_sigla,'')),'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ','AEIOUAEIOUAEIOUAEIOUAON')
	        , inst_padre_nombre = var_recordset.inst_padre_nombre
	        , inst_padre_sigla  = var_recordset.inst_padre_sigla
	        , inst_adscrita = var_recordset.inst_adscrita
	    WHERE usua_codi = NEW.usua_codi;
        END IF;

        IF TG_OP = 'INSERT' THEN
            INSERT INTO usuario (
	        usua_codi, usua_cedula, usua_nomb, usua_apellido, usua_nombre, usua_nuevo, usua_login
	        , usua_pasw, usua_cargo, usua_cargo_cabecera, cargo_tipo, usua_esta, usua_email
	        , usua_titulo, usua_abr_titulo, tipo_usuario, usua_tipo_certificado, usua_subrogado
	        , visible_sub, usua_direccion, usua_telefono, usua_firma_path, depe_codi, depe_nomb
	        , dep_sigla, inst_codi, inst_nombre, inst_sigla, inst_estado, ciu_codi, usua_ciudad
	        , tipo_identificacion, usua_datos, inst_padre_nombre, inst_padre_sigla, inst_adscrita
	    ) VALUES (
	        NEW.usua_codi, NEW.usua_cedula, NEW.usua_nomb, NEW.usua_apellido
	        , TRIM(COALESCE(NEW.usua_nomb::text, ''::text) || ' '::text || COALESCE(NEW.usua_apellido::text, ''::text))
	        , NEW.usua_nuevo, NEW.usua_login, NEW.usua_pasw, NEW.usua_cargo, NEW.usua_cargo_cabecera
	        , NEW.cargo_tipo, NEW.usua_esta, NEW.usua_email, NEW.usua_titulo, NEW.usua_abr_titulo
	        , CASE WHEN NEW.inst_codi = 1 THEN 2 ELSE 1 END
	        , NEW.usua_tipo_certificado, NEW.usua_subrogado, NEW.visible_sub, NEW.usua_direccion
	        , NEW.usua_telefono, NEW.usua_firma_path, NEW.depe_codi, var_recordset.depe_nomb
	        , var_recordset.dep_sigla, NEW.inst_codi, var_recordset.inst_nombre, var_recordset.inst_sigla
	        , var_recordset.inst_estado, var_recordset.ciu_codi, var_recordset.usua_ciudad, NEW.tipo_identificacion
	        , translate(UPPER(coalesce(NEW.usua_cedula,'')||' '||coalesce(NEW.usua_nomb,'')||' '||coalesce(NEW.usua_apellido,'')
	              ||' '||coalesce(NEW.usua_cargo,'')||' '||coalesce(NEW.usua_email,'')||' '||coalesce(var_recordset.depe_nomb,'')
                      ||' '||coalesce(var_recordset.inst_nombre,'')||' '||coalesce(var_recordset.inst_sigla,'')
                  ),'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ','AEIOUAEIOUAEIOUAEIOUAON')
                , var_recordset.inst_padre_nombre, var_recordset.inst_padre_sigla, var_recordset.inst_adscrita
	    );

	END IF;
	
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO log_view_usuario (fecha, tabla, accion, codigo, error) VALUES (now(), 'usuarios', TG_OP, NEW.usua_codi, SQLERRM);
    END;
    RETURN NULL;
END;
$$;


--
-- Name: func_cambiar_dominio_email_usuarios(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_cambiar_dominio_email_usuarios(var_dominio_origen text, var_dominio_destino text) RETURNS integer
    LANGUAGE plpgsql
    AS $$ 
DECLARE 
    var_num_registros integer;
BEGIN 
    select count(1) from usuarios where usua_email ilike '%'||var_dominio_origen and usua_esta=1 into var_num_registros;
    
    update usuarios
    set usua_email=replace(usua_email, var_dominio_origen, var_dominio_destino)
    where usua_email ilike '%'||var_dominio_origen and usua_esta=1;

    RETURN var_num_registros; 
END; 
$$;


--
-- Name: func_grabar_archivo(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_grabar_archivo(var_nombre_archivo text, var_archivo_base_64 text) RETURNS integer
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return 0;
END;
$$;


--
-- Name: func_recuperar_archivo(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_recuperar_archivo(var_arch_codi bigint) RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return '';
END;
$$;


--
-- Name: func_valor_secuencia(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.func_valor_secuencia(sec_nombre text) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    var_recordset record;
Begin
    BEGIN
	execute E'select last_value from '||sec_nombre into var_recordset;
	return var_recordset.last_value;
    EXCEPTION WHEN OTHERS THEN
        return -1;
    END;
end;
$$;


--
-- Name: ver_usuarios(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ver_usuarios(text, text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
DECLARE
    fila RECORD;
    cadena text;
    separador text;
    lista_usuarios text;
Begin
    cadena := '';
    separador := '';
    BEGIN
        lista_usuarios := replace(replace($1,'--',','),'-','');
        for fila in execute E'select usua_nombre, coalesce(inst_sigla,\'\') as inst_sigla from usuario where usua_codi in ('||lista_usuarios||')' loop
            cadena := cadena || separador || ' ' || fila.usua_nombre || case when trim(fila.inst_sigla)<>'' then ' ('||fila.inst_sigla||')' else '' end;
            separador := $2;
         end loop;
    EXCEPTION WHEN OTHERS THEN
        cadena := '';
    END;
    return cadena;
end;
$_$;


--
-- Name: FUNCTION ver_usuarios(text, text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ver_usuarios(text, text) IS 'Muestra la lista de nombres de usuarios a partir de la cadena ingresada en radicado.radicca, radicado.radi_usua_rem y radicado.radi_usua_dest';


--
-- Name: ws_func_validar_login(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ws_func_validar_login(usr_login text, usr_password text, nombre_sistema text, usr_tipo text DEFAULT ''::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    var_password text;
    var_where text;
    var_recordset record;
BEGIN
    -- Limpiamos las cadenas de texto
    if strpos(usr_login||usr_password||nombre_sistema, E'\'')>0 then return 0; end if; -- Valida que los datos no tengan \' (ataque SQL Injection)
    var_password := substr(usr_password,2,26);
    -- Validamos el tipo de usuario, por defecto todos (F: Funcionarios - C: Ciudadanos)
    var_where := '';
    if usr_tipo='F' then var_where := ' and tipo_usuario=1'; end if;
    if usr_tipo='C' then var_where := ' and tipo_usuario=2'; end if;
    BEGIN
	-- TODO - VALIDAR LIMITE DE INTENTOS. Retorna 4
    
	execute E'select usua_codi from usuario 
	          where usua_login=\'U'||usr_login||E'\' 
	              and usua_pasw=\''||var_password||E'\' 
	              and usua_esta=1 and inst_estado=1 '||var_where||' 
	          order by tipo_usuario asc, usua_codi asc 
	          limit 1 offset 0' into var_recordset;
	          
	if var_recordset is not null then
	    -- TODO - INICIALIZAR INTENTOS DE ACCESO Y GRABAR LOG
	    return var_recordset.usua_codi; -- Si el usuario puede acceder al sistema. - RETURN 1
	else
	    -- TODO - SUMAR INTENTO DE ACCESO Y GRABAR LOG
            execute E'select * from usuario 
	              where usua_cedula like \''||usr_login||E'%\' '||var_where||' 
	              order by tipo_usuario asc, usua_esta desc, inst_estado desc
	              limit 1 offset 0' into var_recordset;
	              
	    --if var_recordset is null then return -1; end if; -- Si no existe el usuario - RETURN 2
	    if var_recordset.usua_esta<>1 or var_recordset.inst_estado<>1 then return -2; end if; -- Usuario inactivo - RETURN -2
	    return -1;
	end if;
    EXCEPTION WHEN OTHERS THEN
        return -1;
    END;
    return -1;
END;
$$;


--
-- Name: es; Type: TEXT SEARCH CONFIGURATION; Schema: public; Owner: -
--

CREATE TEXT SEARCH CONFIGURATION public.es (
    PARSER = pg_catalog."default" );

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR asciiword WITH spanish_stem;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR word WITH public.unaccent, spanish_stem;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR numword WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR email WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR url WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR host WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR sfloat WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR version WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR hword_numpart WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR hword_part WITH public.unaccent, spanish_stem;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR hword_asciipart WITH spanish_stem;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR numhword WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR asciihword WITH spanish_stem;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR hword WITH public.unaccent, spanish_stem;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR url_path WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR file WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR "float" WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR "int" WITH simple;

ALTER TEXT SEARCH CONFIGURATION public.es
    ADD MAPPING FOR uint WITH simple;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accion (
    accion_codi integer NOT NULL,
    accion_nombre character varying(50),
    inst_codi bigint
);


--
-- Name: TABLE accion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accion IS 'Lista de acciones que se muestran al momento de reasignar un documento para no tener que escribir en observaciones';


--
-- Name: COLUMN accion.accion_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accion.accion_codi IS 'Id';


--
-- Name: COLUMN accion.accion_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accion.accion_nombre IS 'Detalle';


--
-- Name: COLUMN accion.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accion.inst_codi IS 'Id de la institución a la que pertenece';


--
-- Name: sec_actualizar_sistema; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_actualizar_sistema
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: actualizar_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.actualizar_sistema (
    actu_codi integer DEFAULT nextval('public.sec_actualizar_sistema'::regclass) NOT NULL,
    sentencia character varying,
    sentencia_verificacion character varying,
    estado smallint DEFAULT 0,
    observacion character varying,
    svn character varying,
    num_registros_total bigint DEFAULT 0,
    num_registros_restantes bigint DEFAULT 0,
    num_registros_bloque integer DEFAULT 0
);


--
-- Name: TABLE actualizar_sistema; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.actualizar_sistema IS 'Gestiona las actualizaciones de tablas que tienen muchos registros, actualizando los registros en bloques';


--
-- Name: COLUMN actualizar_sistema.sentencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.actualizar_sistema.sentencia IS 'Query de la actualización';


--
-- Name: COLUMN actualizar_sistema.sentencia_verificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.actualizar_sistema.sentencia_verificacion IS 'Query que sirve para validar el número de registros restantes por actualizar';


--
-- Name: COLUMN actualizar_sistema.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.actualizar_sistema.estado IS '0 - Pendiente
1 - Ejecutado
2 - Cancelado
3 – Error';


--
-- Name: COLUMN actualizar_sistema.observacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.actualizar_sistema.observacion IS 'Comentario acerca del cambio';


--
-- Name: COLUMN actualizar_sistema.svn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.actualizar_sistema.svn IS 'Revisión SVN de la que depende el cambio';


--
-- Name: COLUMN actualizar_sistema.num_registros_total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.actualizar_sistema.num_registros_total IS 'Número de registros a ser actualizados';


--
-- Name: COLUMN actualizar_sistema.num_registros_restantes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.actualizar_sistema.num_registros_restantes IS 'Númer de registros que restan por actualizar';


--
-- Name: COLUMN actualizar_sistema.num_registros_bloque; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.actualizar_sistema.num_registros_bloque IS 'Número de registros que se actualizarán cada vez que se ejecute el proceso';


--
-- Name: anexos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anexos (
    anex_radi_nume numeric(20,0) NOT NULL,
    anex_codigo character varying(50) NOT NULL,
    anex_tipo smallint NOT NULL,
    anex_desc character varying(512),
    anex_numero numeric(5,0) NOT NULL,
    anex_path character varying(200),
    anex_borrado character varying(1) NOT NULL,
    anex_fecha timestamp with time zone,
    anex_nombre character varying(100),
    anex_usua_codi integer,
    anex_tamano numeric,
    anex_fisico smallint DEFAULT 0,
    anex_fecha_firma timestamp with time zone,
    anex_datos_firma character varying,
    arch_codi bigint DEFAULT 0,
    arch_codi_firma bigint DEFAULT 0
);


--
-- Name: TABLE anexos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.anexos IS 'Archivos adjuntos a los documentos';


--
-- Name: COLUMN anexos.anex_radi_nume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_radi_nume IS 'Número de radicado al que está asociado el anexo';


--
-- Name: COLUMN anexos.anex_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_codigo IS 'Id del anexo';


--
-- Name: COLUMN anexos.anex_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_tipo IS 'Tipo de documento (.doc, .pdf, etc.) depende de la tabla anexos_tipo';


--
-- Name: COLUMN anexos.anex_desc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_desc IS 'Descripción del anexo';


--
-- Name: COLUMN anexos.anex_numero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_numero IS 'Número de anexo';


--
-- Name: COLUMN anexos.anex_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_path IS 'Path en el que se encuentra el archivo en la bodega';


--
-- Name: COLUMN anexos.anex_borrado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_borrado IS 'Indica si el archivo fue eliminado o no';


--
-- Name: COLUMN anexos.anex_fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_fecha IS 'Fecha en la que se subió el anexo';


--
-- Name: COLUMN anexos.anex_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_nombre IS 'Nombre original del archivo con el que lo subió el cliente';


--
-- Name: COLUMN anexos.anex_usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_usua_codi IS 'Usuario que anexo el archivo';


--
-- Name: COLUMN anexos.anex_tamano; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_tamano IS 'Tamaño del archivo';


--
-- Name: COLUMN anexos.anex_fisico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_fisico IS 'Determina si el origen del documento es fisico o electronico';


--
-- Name: COLUMN anexos.anex_fecha_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_fecha_firma IS 'Fecha de la firma digital';


--
-- Name: COLUMN anexos.anex_datos_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.anex_datos_firma IS 'Datos del firmante';


--
-- Name: COLUMN anexos.arch_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.arch_codi IS 'Código del archivo almacenado en la BDD de documentos';


--
-- Name: COLUMN anexos.arch_codi_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos.arch_codi_firma IS 'Código del archivo firmado electrónicamente, almacenado en la BDD de documentos';


--
-- Name: anexos_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anexos_tipo (
    anex_tipo_codi smallint NOT NULL,
    anex_tipo_ext character varying(10) NOT NULL,
    anex_tipo_desc character varying(50),
    anex_tipo_estado numeric(1,0) DEFAULT 1
);


--
-- Name: TABLE anexos_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.anexos_tipo IS 'Tipos de anexos que se permiten cargar al sistema; por seguridad se suben solo los tipos de archivos permitidos';


--
-- Name: COLUMN anexos_tipo.anex_tipo_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos_tipo.anex_tipo_codi IS 'Id';


--
-- Name: COLUMN anexos_tipo.anex_tipo_ext; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos_tipo.anex_tipo_ext IS 'Extensión del documento';


--
-- Name: COLUMN anexos_tipo.anex_tipo_desc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos_tipo.anex_tipo_desc IS 'Descripción del tipo de archivo';


--
-- Name: COLUMN anexos_tipo.anex_tipo_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.anexos_tipo.anex_tipo_estado IS 'Estado, activo o inactivo';


--
-- Name: archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archivo (
    arch_codi bigint NOT NULL,
    arch_padre bigint DEFAULT 0 NOT NULL,
    arch_nombre character varying(40),
    arch_sigla character varying(6),
    depe_codi integer,
    arch_estado smallint DEFAULT 1,
    arch_ocupado smallint DEFAULT 0
);


--
-- Name: TABLE archivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.archivo IS 'Tabla recursiva, estructura del archivo físico de una institución';


--
-- Name: COLUMN archivo.arch_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo.arch_codi IS 'Id del item';


--
-- Name: COLUMN archivo.arch_padre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo.arch_padre IS 'Id del item padre';


--
-- Name: COLUMN archivo.arch_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo.arch_nombre IS 'Nombre del item';


--
-- Name: COLUMN archivo.arch_sigla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo.arch_sigla IS 'Abreviatura del item';


--
-- Name: COLUMN archivo.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo.depe_codi IS 'Área a la que pertenece';


--
-- Name: COLUMN archivo.arch_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo.arch_estado IS 'Indica si se pueden seguir añadiendo documentos en la ubicacion actual';


--
-- Name: COLUMN archivo.arch_ocupado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo.arch_ocupado IS 'Indica si el item está relacionado con un expediente virtual';


--
-- Name: archivo_nivel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archivo_nivel (
    arch_codi integer NOT NULL,
    depe_codi integer NOT NULL,
    arch_nombre character varying(50) NOT NULL,
    arch_descripcion character varying(100)
);


--
-- Name: TABLE archivo_nivel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.archivo_nivel IS 'Niveles que tendrá la estructura del archivo físico';


--
-- Name: COLUMN archivo_nivel.arch_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_nivel.arch_codi IS 'Id del Item, es un secuencial dependiendo del area funcional';


--
-- Name: COLUMN archivo_nivel.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_nivel.depe_codi IS 'Area funcional a la que pertenece el archivo';


--
-- Name: COLUMN archivo_nivel.arch_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_nivel.arch_nombre IS 'Nombre del Item';


--
-- Name: COLUMN archivo_nivel.arch_descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_nivel.arch_descripcion IS 'Descripcion del Item';


--
-- Name: archivo_radicado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archivo_radicado (
    radi_nume_radi numeric(20,0) NOT NULL,
    arch_codi bigint NOT NULL,
    usua_codi integer,
    fecha timestamp with time zone,
    depe_codi integer,
    anex_numero smallint DEFAULT 0 NOT NULL
);


--
-- Name: TABLE archivo_radicado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.archivo_radicado IS 'Relaciona RADICADO con ARCHIVO, guarda las asociaciones de los documentos en un item específico del archivo';


--
-- Name: COLUMN archivo_radicado.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_radicado.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN archivo_radicado.arch_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_radicado.arch_codi IS 'Id del item del archivo';


--
-- Name: COLUMN archivo_radicado.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_radicado.usua_codi IS 'Usuario que archivo el documento';


--
-- Name: COLUMN archivo_radicado.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_radicado.fecha IS 'Fecha en que se archivó el documento';


--
-- Name: COLUMN archivo_radicado.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_radicado.depe_codi IS 'Área en la que se archivó el documento';


--
-- Name: COLUMN archivo_radicado.anex_numero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.archivo_radicado.anex_numero IS 'Numero de anexo que se esta archivando';


--
-- Name: bandeja_compartida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bandeja_compartida (
    ban_com_codi integer NOT NULL,
    usua_codi_jefe bigint,
    usua_codi bigint,
    ban_com_fecha timestamp with time zone
);


--
-- Name: TABLE bandeja_compartida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bandeja_compartida IS 'Guarda la relación entre el jefe del área y los usuarios a quienes se les comparte la bandeja de entrada';


--
-- Name: COLUMN bandeja_compartida.ban_com_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bandeja_compartida.ban_com_codi IS 'Id';


--
-- Name: COLUMN bandeja_compartida.usua_codi_jefe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bandeja_compartida.usua_codi_jefe IS 'Código del usuario jefe';


--
-- Name: COLUMN bandeja_compartida.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bandeja_compartida.usua_codi IS 'Códigop del usuario al que le comparten la bandeja';


--
-- Name: COLUMN bandeja_compartida.ban_com_fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bandeja_compartida.ban_com_fecha IS 'Fecha en la que se compartió la bandeja';


--
-- Name: bandeja_compartida_ban_com_codi_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bandeja_compartida_ban_com_codi_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bandeja_compartida_ban_com_codi_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bandeja_compartida_ban_com_codi_seq1 OWNED BY public.bandeja_compartida.ban_com_codi;


--
-- Name: sec_bloqueo_sistema; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_bloqueo_sistema
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bloqueo_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bloqueo_sistema (
    bloq_codi integer DEFAULT nextval('public.sec_bloqueo_sistema'::regclass) NOT NULL,
    fecha_inicio timestamp with time zone,
    fecha_fin timestamp with time zone,
    estado integer DEFAULT 0,
    descripcion character varying,
    mensaje_usuario character varying,
    usua_acceso character varying,
    tipo_mensaje integer DEFAULT 0
);


--
-- Name: TABLE bloqueo_sistema; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bloqueo_sistema IS 'Alertas y bloqueos del sistema; para hacer un bloqueo se debe cambiar la variable correspondiente en el archivo config.php';


--
-- Name: COLUMN bloqueo_sistema.bloq_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloqueo_sistema.bloq_codi IS 'Id del bloqueo';


--
-- Name: COLUMN bloqueo_sistema.fecha_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloqueo_sistema.fecha_inicio IS 'Fecha y hora cuando inicia el bloqueo o la alerta';


--
-- Name: COLUMN bloqueo_sistema.fecha_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloqueo_sistema.fecha_fin IS 'Fecha y hora cuando finaliza el bloqueo o la alerta';


--
-- Name: COLUMN bloqueo_sistema.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloqueo_sistema.estado IS 'Estado de la alerta:
0 - Cancelado
1 - Activo
2 - Eliminado';


--
-- Name: COLUMN bloqueo_sistema.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloqueo_sistema.descripcion IS 'Descripción corta del mensaje';


--
-- Name: COLUMN bloqueo_sistema.mensaje_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloqueo_sistema.mensaje_usuario IS 'Mensaje que se muestra al usuario en formato HTML';


--
-- Name: COLUMN bloqueo_sistema.usua_acceso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloqueo_sistema.usua_acceso IS 'Lista de usuarios que tendrán acceso al sistema, separados por guiones';


--
-- Name: COLUMN bloqueo_sistema.tipo_mensaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloqueo_sistema.tipo_mensaje IS '0 - Bloqueo General
1 - Bloqueo a nuevos usuarios
2 - Mensaje de alerta a todos los usuarios';


--
-- Name: cargo_cargo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cargo_cargo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carpeta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carpeta (
    carp_codi smallint NOT NULL,
    carp_nombre character varying(50) NOT NULL,
    carp_descripcion character varying(100),
    carp_orden integer
);


--
-- Name: TABLE carpeta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.carpeta IS 'Lista de las bandejas que se muestran al usuario en el menú principal';


--
-- Name: COLUMN carpeta.carp_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carpeta.carp_codi IS 'Id de la bandeja';


--
-- Name: COLUMN carpeta.carp_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carpeta.carp_nombre IS 'Nombre de la bandeja';


--
-- Name: COLUMN carpeta.carp_descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carpeta.carp_descripcion IS 'Descripción que se muestra en el tool tip';


--
-- Name: COLUMN carpeta.carp_orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carpeta.carp_orden IS 'Orden en el que se mostraran las bandejas';


--
-- Name: categoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categoria (
    cat_codi integer NOT NULL,
    cat_descr character varying(150) NOT NULL
);


--
-- Name: TABLE categoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.categoria IS 'Catálogo con las categorías de los documentos (Normal, urgente, etc.)';


--
-- Name: COLUMN categoria.cat_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categoria.cat_codi IS 'Id';


--
-- Name: COLUMN categoria.cat_descr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categoria.cat_descr IS 'Descripción';


--
-- Name: categoria_cat_codi_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categoria_cat_codi_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categoria_cat_codi_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categoria_cat_codi_seq1 OWNED BY public.categoria.cat_codi;


--
-- Name: ciudad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ciudad (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    id_padre integer
);


--
-- Name: TABLE ciudad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ciudad IS 'Catálogo de ciudades, tabla recursiva';


--
-- Name: COLUMN ciudad.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudad.id IS 'Id de la ciudad';


--
-- Name: COLUMN ciudad.nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudad.nombre IS 'Nombre de la ciudad';


--
-- Name: COLUMN ciudad.id_padre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudad.id_padre IS 'Código del país o de la provincia a la que pertenece la ciudad';


--
-- Name: ciudadano; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ciudadano (
    ciu_nombre character varying(200),
    ciu_direccion character varying(150),
    ciu_empresa character varying(200),
    ciu_cargo character varying(150),
    ciu_telefono character varying(50),
    ciu_email character varying(500),
    ciu_titulo character varying(100),
    ciu_abr_titulo character varying(30),
    ciu_codigo integer DEFAULT nextval(('public.usuarios_usua_codi_seq'::text)::regclass) NOT NULL,
    ciu_apellido character varying(200),
    ciu_cedula character varying(50),
    inst_codi integer,
    ciu_estado integer DEFAULT 1,
    ciu_documento character varying(50),
    ciu_pasw character varying(35),
    ciu_nuevo smallint DEFAULT 0,
    usua_codi_actualiza integer,
    ciu_fecha_actualiza timestamp with time zone,
    ciudad_codi integer,
    ciu_obs_actualiza character varying,
    ciu_referencia character varying
);


--
-- Name: TABLE ciudadano; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ciudadano IS 'Contiene los usuarios externos (que no pertenecen a una institución pública) y que solo pueden conectarse al sistema para consultar los documentos que dejaron en alguna institución y las respuestas recibidas';


--
-- Name: COLUMN ciudadano.ciu_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_nombre IS 'Nombre de la persona';


--
-- Name: COLUMN ciudadano.ciu_direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_direccion IS 'Dirección Domiciliaria';


--
-- Name: COLUMN ciudadano.ciu_empresa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_empresa IS 'Nombre de la empresa a la que pertenece';


--
-- Name: COLUMN ciudadano.ciu_cargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_cargo IS 'Cargo que desempeña en su empresa';


--
-- Name: COLUMN ciudadano.ciu_telefono; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_telefono IS 'Número telefónico';


--
-- Name: COLUMN ciudadano.ciu_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_email IS 'email; pueden ser varios separados por comas';


--
-- Name: COLUMN ciudadano.ciu_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_titulo IS 'Título o tratamiento (Señor, Ingeniero, etc.)';


--
-- Name: COLUMN ciudadano.ciu_abr_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_abr_titulo IS 'Abreviación del título o tratamiento (Sr., Ing., etc.)';


--
-- Name: COLUMN ciudadano.ciu_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_codigo IS 'Id del usuario ciudadano';


--
-- Name: COLUMN ciudadano.ciu_apellido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_apellido IS 'Apellido de la persona';


--
-- Name: COLUMN ciudadano.ciu_cedula; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_cedula IS 'Número de cédula de ciudadanía';


--
-- Name: COLUMN ciudadano.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.inst_codi IS 'Institución en la que se creo el ciudadano (log)';


--
-- Name: COLUMN ciudadano.ciu_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_estado IS 'Estado del ciudadano
0 - Inactivo
1 - Activo';


--
-- Name: COLUMN ciudadano.ciu_documento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_documento IS 'Número de identificación adicional (RUC, pasaporte, etc.)';


--
-- Name: COLUMN ciudadano.ciu_pasw; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_pasw IS 'Contraseña';


--
-- Name: COLUMN ciudadano.ciu_nuevo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_nuevo IS 'Indica si es un usuario nuevo y si se le debe enviar la contraseña a su correo electrónico';


--
-- Name: COLUMN ciudadano.usua_codi_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.usua_codi_actualiza IS 'Usuario que realizó la última modificación a los datos del ciudadano';


--
-- Name: COLUMN ciudadano.ciu_fecha_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_fecha_actualiza IS 'Fecha en que se modificó por última vez al ciudadano';


--
-- Name: COLUMN ciudadano.ciudad_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciudad_codi IS 'Id de la ciudad en la que se encuentra la persona';


--
-- Name: COLUMN ciudadano.ciu_obs_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_obs_actualiza IS 'Descripción de los últimos cambios realizados en la información del usuario';


--
-- Name: COLUMN ciudadano.ciu_referencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano.ciu_referencia IS 'Datos de referencia de la dirección del domicilio';


--
-- Name: ciudadano_tmp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ciudadano_tmp (
    ciu_codigo integer NOT NULL,
    ciu_cedula character varying(50),
    ciu_documento character varying(50),
    ciu_nombre character varying(200),
    ciu_apellido character varying(200),
    ciu_titulo character varying(100),
    ciu_abr_titulo character varying(30),
    ciu_empresa character varying(200),
    ciu_cargo character varying(150),
    ciu_direccion character varying(150),
    ciu_telefono character varying(50),
    ciu_email character varying(500),
    ciudad_codi integer,
    ciu_estado smallint DEFAULT 1,
    ciu_referencia character varying
);


--
-- Name: TABLE ciudadano_tmp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ciudadano_tmp IS 'Tabla temporal en la que se guardan los cambios realizados a ciudadanos hasta que sean autorizados por un usuario con los permisos correspondientes';


--
-- Name: COLUMN ciudadano_tmp.ciu_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_codigo IS 'Id del usuario';


--
-- Name: COLUMN ciudadano_tmp.ciu_cedula; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_cedula IS 'Número de cédula de ciudadanía';


--
-- Name: COLUMN ciudadano_tmp.ciu_documento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_documento IS 'Número de identificación adicional (RUC, pasaporte, etc.)';


--
-- Name: COLUMN ciudadano_tmp.ciu_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_nombre IS 'Nombre de la persona';


--
-- Name: COLUMN ciudadano_tmp.ciu_apellido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_apellido IS 'Apellido de la persona';


--
-- Name: COLUMN ciudadano_tmp.ciu_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_titulo IS 'Título o tratamiento (Señor, Ingeniero, etc.)';


--
-- Name: COLUMN ciudadano_tmp.ciu_abr_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_abr_titulo IS 'Abreviación del título o tratamiento (Sr., Ing., etc.)';


--
-- Name: COLUMN ciudadano_tmp.ciu_empresa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_empresa IS 'Nombre de la empresa a la que pertenece';


--
-- Name: COLUMN ciudadano_tmp.ciu_cargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_cargo IS 'Cargo que desempeña en su empresa';


--
-- Name: COLUMN ciudadano_tmp.ciu_direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_direccion IS 'Dirección Domiciliaria';


--
-- Name: COLUMN ciudadano_tmp.ciu_telefono; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_telefono IS 'Número telefónico';


--
-- Name: COLUMN ciudadano_tmp.ciu_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_email IS 'Correo electrónico';


--
-- Name: COLUMN ciudadano_tmp.ciudad_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciudad_codi IS 'Id de la ciudad en la que se encuentra la persona';


--
-- Name: COLUMN ciudadano_tmp.ciu_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_estado IS 'Determina si la solicitud de cambio ya fue revisada por un administrador';


--
-- Name: COLUMN ciudadano_tmp.ciu_referencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ciudadano_tmp.ciu_referencia IS 'Datos de referencia de la dirección del domicilio';


--
-- Name: codificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codificacion (
    cod_codi integer NOT NULL,
    cod_descripcion character varying(150) NOT NULL,
    inst_codi bigint
);


--
-- Name: TABLE codificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.codificacion IS 'Codificación o tipificación de los documentos';


--
-- Name: COLUMN codificacion.cod_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.codificacion.cod_codi IS 'Id';


--
-- Name: COLUMN codificacion.cod_descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.codificacion.cod_descripcion IS 'Descripción';


--
-- Name: COLUMN codificacion.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.codificacion.inst_codi IS 'Institución a la que pertenece la codificación';


--
-- Name: codificacion_cod_codi_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.codificacion_cod_codi_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: codificacion_cod_codi_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.codificacion_cod_codi_seq1 OWNED BY public.codificacion.cod_codi;


--
-- Name: hist_eventos_hist_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hist_eventos_hist_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hist_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hist_eventos (
    hist_fech timestamp with time zone NOT NULL,
    usua_codi_ori integer NOT NULL,
    radi_nume_radi numeric(20,0) NOT NULL,
    hist_obse character varying(600) NOT NULL,
    usua_codi_dest integer,
    sgd_ttr_codigo smallint,
    hist_codi bigint DEFAULT nextval('public.hist_eventos_hist_codi_seq'::regclass) NOT NULL,
    hist_referencia character varying(50)
);


--
-- Name: TABLE hist_eventos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hist_eventos IS 'Registro de las transacciones realizadas con los documentos';


--
-- Name: COLUMN hist_eventos.hist_fech; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_eventos.hist_fech IS 'Fecha de la transacción';


--
-- Name: COLUMN hist_eventos.usua_codi_ori; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_eventos.usua_codi_ori IS 'Usuario que realizó la transacción';


--
-- Name: COLUMN hist_eventos.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_eventos.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN hist_eventos.hist_obse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_eventos.hist_obse IS 'Observaciones';


--
-- Name: COLUMN hist_eventos.usua_codi_dest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_eventos.usua_codi_dest IS 'Codigo del usuario destino, en caso que la transacción involucre a más de un usuario';


--
-- Name: COLUMN hist_eventos.sgd_ttr_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_eventos.sgd_ttr_codigo IS 'Id de la transacción';


--
-- Name: COLUMN hist_eventos.hist_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_eventos.hist_codi IS 'Id';


--
-- Name: COLUMN hist_eventos.hist_referencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_eventos.hist_referencia IS 'Campo adicional para guardar códigos o fechas o datos adicionales dependiendo de la transacción';


--
-- Name: informados_info_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.informados_info_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: informados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.informados (
    radi_nume_radi numeric(20,0) NOT NULL,
    info_desc character varying(600),
    info_fech date NOT NULL,
    info_leido smallint DEFAULT 0,
    usua_codi integer,
    usua_info integer,
    info_codi bigint DEFAULT nextval('public.informados_info_codi_seq'::regclass) NOT NULL
);


--
-- Name: TABLE informados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.informados IS 'Documentos informados';


--
-- Name: COLUMN informados.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.informados.radi_nume_radi IS 'id del documento';


--
-- Name: COLUMN informados.info_desc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.informados.info_desc IS 'Comentario';


--
-- Name: COLUMN informados.info_fech; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.informados.info_fech IS 'Fecha';


--
-- Name: COLUMN informados.info_leido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.informados.info_leido IS 'Bandera que indica si ya fue leido por el destinatario';


--
-- Name: COLUMN informados.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.informados.usua_codi IS 'Usuario destinatario';


--
-- Name: COLUMN informados.usua_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.informados.usua_info IS 'Usuario Informador';


--
-- Name: COLUMN informados.info_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.informados.info_codi IS 'Id';


--
-- Name: radicado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.radicado (
    radi_nume_radi numeric(20,0) NOT NULL,
    radi_nume_text character varying(50),
    radi_nume_temp numeric(20,0) NOT NULL,
    radi_fech_radi timestamp with time zone NOT NULL,
    radi_fech_ofic timestamp with time zone,
    radi_nume_deri numeric(20,0),
    radi_path character varying(150),
    esta_codi smallint,
    radi_usua_actu integer,
    radi_fech_asig timestamp with time zone,
    radi_leido smallint DEFAULT 0,
    radi_fech_agend timestamp with time zone,
    radi_cca character varying,
    radi_cuentai character varying(50),
    radi_asunto character varying(350),
    radi_resumen character varying(1000),
    radi_desc_anex character varying(100),
    radi_flag_impr smallint,
    radi_texto integer,
    radi_tipo smallint,
    radi_usua_rem character varying,
    radi_usua_ante integer,
    radi_usua_dest character varying,
    radi_usua_radi integer,
    radi_permiso smallint DEFAULT 0,
    radi_nomb_usua_firma character varying,
    radi_fech_firma timestamp with time zone,
    radi_inst_actu integer,
    radi_archivo smallint DEFAULT 0,
    usar_plantilla integer DEFAULT 0,
    ajust_texto integer DEFAULT 100,
    radi_tipo_impresion character varying(1) DEFAULT 1,
    radi_lista_dest character varying,
    radi_tipo_archivo smallint DEFAULT 0,
    cod_codi bigint DEFAULT 0,
    cat_codi bigint DEFAULT 0,
    radi_ocultar_recorrido smallint DEFAULT 0,
    radi_usua_redirigido bigint DEFAULT 0,
    radi_text_temp character varying(50),
    radi_nume_asoc numeric(20,0),
    arch_codi bigint DEFAULT 0,
    arch_codi_firma bigint DEFAULT 0,
    radi_imagen character varying(50)
);
ALTER TABLE ONLY public.radicado ALTER COLUMN radi_nume_text SET STORAGE EXTERNAL;


--
-- Name: TABLE radicado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.radicado IS 'Información de los documentos registrados';


--
-- Name: COLUMN radicado.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN radicado.radi_nume_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_nume_text IS 'Número del documento según el formato definido en la institución';


--
-- Name: COLUMN radicado.radi_nume_temp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_nume_temp IS 'Id del documento padre (desde el que se generan las copias para cada destinatario)';


--
-- Name: COLUMN radicado.radi_fech_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_fech_radi IS 'Fecha en la que se creó el documento';


--
-- Name: COLUMN radicado.radi_fech_ofic; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_fech_ofic IS 'Fecha en la que se firma y se envía el documento o fecha de referencia en el caso de documentos externos';


--
-- Name: COLUMN radicado.radi_nume_deri; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_nume_deri IS 'Id del documento al cual se encuentra asociado el documento actual (responder)';


--
-- Name: COLUMN radicado.radi_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_path IS 'Path donde se encuentra el archivo PDF en la bodega';


--
-- Name: COLUMN radicado.esta_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.esta_codi IS 'Estado en el que se encuentra el documento';


--
-- Name: COLUMN radicado.radi_usua_actu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_usua_actu IS 'Id del usuario actual del documento';


--
-- Name: COLUMN radicado.radi_fech_asig; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_fech_asig IS 'Fecha máxima para realización de trámite cuando se reasigna un documento';


--
-- Name: COLUMN radicado.radi_leido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_leido IS 'bandera que indica si el documento ya fue leido';


--
-- Name: COLUMN radicado.radi_fech_agend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_fech_agend IS 'Campo en desuso';


--
-- Name: COLUMN radicado.radi_cca; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_cca IS 'Lista de usuarios para enviar copias, se separan por guiones (-id1--id2-)';


--
-- Name: COLUMN radicado.radi_cuentai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_cuentai IS 'Numero de referencia del documento';


--
-- Name: COLUMN radicado.radi_asunto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_asunto IS 'Asunto del documento';


--
-- Name: COLUMN radicado.radi_resumen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_resumen IS 'Notas adicionales al documento';


--
-- Name: COLUMN radicado.radi_desc_anex; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_desc_anex IS 'Descripción general de los anexos';


--
-- Name: COLUMN radicado.radi_flag_impr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_flag_impr IS 'Campo en desuso';


--
-- Name: COLUMN radicado.radi_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_texto IS 'Id de la version del texto del documento que se está utilizando';


--
-- Name: COLUMN radicado.radi_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_tipo IS 'Tipo de documento (memo, oficio, etc.)';


--
-- Name: COLUMN radicado.radi_usua_rem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_usua_rem IS 'Lista de usuarios remitentes del documento; se separan por guiones (-id1--id2-)';


--
-- Name: COLUMN radicado.radi_usua_ante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_usua_ante IS 'Id del usuario anterior del documento';


--
-- Name: COLUMN radicado.radi_usua_dest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_usua_dest IS 'Lista de usuarios destinatarios del documento; se separan por guiones (-id1--id2-)';


--
-- Name: COLUMN radicado.radi_usua_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_usua_radi IS 'Id del usuario que registro el documento';


--
-- Name: COLUMN radicado.radi_permiso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_permiso IS 'nivel de seguridad del documento (publico o confidencial)';


--
-- Name: COLUMN radicado.radi_nomb_usua_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_nomb_usua_firma IS 'Datos de la firma electrónica del documento';


--
-- Name: COLUMN radicado.radi_fech_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_fech_firma IS 'Fecha en que se firmó electrónicamente el documento (cuando se validó en quipux)';


--
-- Name: COLUMN radicado.radi_inst_actu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_inst_actu IS 'Institucion actual del documento';


--
-- Name: COLUMN radicado.radi_archivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_archivo IS 'Indica si el documento se encuentra archivado físicamente';


--
-- Name: COLUMN radicado.usar_plantilla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.usar_plantilla IS 'Bandera que indica si el documento se generará con una plantilla o en una hoja en blanco';


--
-- Name: COLUMN radicado.ajust_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.ajust_texto IS 'Determina si el archivo se comprime o se expande (Tamaño de letra)';


--
-- Name: COLUMN radicado.radi_tipo_impresion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_tipo_impresion IS 'Opciones de impresión - Modo de impresión de los datos del destinatario (combo)';


--
-- Name: COLUMN radicado.radi_lista_dest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_lista_dest IS 'Listado de las listas de usuarios seleccionadas para el envío de los documentos';


--
-- Name: COLUMN radicado.radi_tipo_archivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_tipo_archivo IS 'Define si el archivo de la imagen del documento (almacenado en radi_path) es temporal (generada por el sistema y no firmada) o definitiva.';


--
-- Name: COLUMN radicado.cod_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.cod_codi IS 'Id de la codificación del documento (tipificación)';


--
-- Name: COLUMN radicado.cat_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.cat_codi IS 'Id de la categoría del documento';


--
-- Name: COLUMN radicado.radi_ocultar_recorrido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_ocultar_recorrido IS 'Indica si se ocultará el recorrido del documento';


--
-- Name: COLUMN radicado.radi_usua_redirigido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_usua_redirigido IS 'Id del usuario al que se redirigirá el documento (registro de documentos externos)';


--
-- Name: COLUMN radicado.radi_text_temp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_text_temp IS 'Número temporal del documento que se le asigno mientras estaba en elaboración';


--
-- Name: COLUMN radicado.radi_nume_asoc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_nume_asoc IS 'Id del documento antecedente (documentos asociados)';


--
-- Name: COLUMN radicado.arch_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.arch_codi IS 'Código del archivo almacenado en la BDD de documentos';


--
-- Name: COLUMN radicado.arch_codi_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.arch_codi_firma IS 'Código del archivo firmado electrónicamente, almacenado en la BDD de documentos';


--
-- Name: COLUMN radicado.radi_imagen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado.radi_imagen IS 'Código del anexo cargado como imágen digitalizada';


--
-- Name: contadores; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.contadores AS
 SELECT r.radi_usua_actu AS usua_codi,
    count(
        CASE
            WHEN (r.esta_codi = 1) THEN 1
            ELSE NULL::integer
        END) AS "En
elaboracion",
    count(
        CASE
            WHEN (r.esta_codi = 2) THEN 1
            ELSE NULL::integer
        END) AS "En tramite",
    count(
        CASE
            WHEN (r.esta_codi = 7) THEN 1
            ELSE NULL::integer
        END) AS "Eliminados",
    count(
        CASE
            WHEN (r.esta_codi = 3) THEN 1
            ELSE NULL::integer
        END) AS "No enviados",
    count(
        CASE
            WHEN ((r.esta_codi = 6) AND (r.radi_nume_radi = r.radi_nume_temp)) THEN 1
            ELSE NULL::integer
        END) AS "Enviados",
    count(
        CASE
            WHEN (r.esta_codi = 0) THEN 1
            ELSE NULL::integer
        END) AS "Archivados",
    ( SELECT count(hist_eventos.radi_nume_radi) AS count
           FROM public.hist_eventos
          WHERE ((hist_eventos.usua_codi_ori = r.radi_usua_actu) AND (hist_eventos.sgd_ttr_codigo = 9))) AS "Reasignados",
    ( SELECT count(*) AS count
           FROM public.informados
          WHERE (informados.usua_codi = r.radi_usua_actu)) AS "Informados"
   FROM public.radicado r
  GROUP BY r.radi_usua_actu;


--
-- Name: sec_contenido; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_contenido
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contenido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contenido (
    cont_codi integer DEFAULT nextval('public.sec_contenido'::regclass) NOT NULL,
    cont_tipo_codi integer,
    descripcion character varying,
    texto character varying,
    fecha_crea timestamp with time zone,
    fecha_actualiza timestamp with time zone
);


--
-- Name: TABLE contenido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contenido IS 'Guarda la información que se muestra en las pantallas index y ayuda del sistema';


--
-- Name: COLUMN contenido.cont_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido.cont_codi IS 'Id';


--
-- Name: COLUMN contenido.cont_tipo_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido.cont_tipo_codi IS 'Tipo de contenido, indica en dónde se muestra la información';


--
-- Name: COLUMN contenido.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido.descripcion IS 'Descripción de la información';


--
-- Name: COLUMN contenido.texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido.texto IS 'Texto en formato HTML que se muestra en las páginas';


--
-- Name: COLUMN contenido.fecha_crea; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido.fecha_crea IS 'Fecha de creación';


--
-- Name: COLUMN contenido.fecha_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido.fecha_actualiza IS 'Fecha de actualización';


--
-- Name: contenido_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contenido_tipo (
    cont_tipo_codi integer NOT NULL,
    funcionalidad character varying,
    categoria character varying
);


--
-- Name: TABLE contenido_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contenido_tipo IS 'Catálogo con los tipos de contenidos que se muestran en las pantallas de index y ayuda del sistema';


--
-- Name: COLUMN contenido_tipo.cont_tipo_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido_tipo.cont_tipo_codi IS 'Id';


--
-- Name: COLUMN contenido_tipo.funcionalidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido_tipo.funcionalidad IS 'Página a la que pertenece';


--
-- Name: COLUMN contenido_tipo.categoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contenido_tipo.categoria IS 'Categoría o tipo de contenido';


--
-- Name: solicitud_firma_ciudadano; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitud_firma_ciudadano (
    sol_codigo integer DEFAULT nextval(('public.solicitud_usua_codi_seq'::text)::regclass) NOT NULL,
    ciu_codigo integer,
    sol_observaciones character varying(700),
    sol_firma smallint,
    sol_estado smallint,
    sol_planilla smallint DEFAULT 0,
    sol_cedula smallint DEFAULT 0,
    sol_acuerdo smallint DEFAULT 0,
    sol_planilla_estado smallint DEFAULT 0,
    sol_cedula_estado smallint DEFAULT 0,
    sol_acuerdo_estado smallint DEFAULT 0,
    ciu_nombre character varying(150),
    ciu_direccion character varying(150),
    ciu_empresa character varying(150),
    ciu_cargo character varying(150),
    ciu_apellido character varying(150),
    ciu_cedula character varying(25),
    ciu_telefono character varying(50),
    ciu_email character varying(50),
    ciu_abr_titulo character varying(30),
    ciu_titulo character varying(100),
    ciu_documento character varying(50),
    ciudad_codi integer,
    sol_fecha_envio timestamp with time zone,
    sol_fecha_autorizado timestamp with time zone,
    ciu_referencia character varying
);


--
-- Name: TABLE solicitud_firma_ciudadano; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitud_firma_ciudadano IS 'Contiene las solicitudes de ciudadanos que desean utilizar el sistema Quipux para envío de documentación electrónica a las instituciones (debe tener firma digital)';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_codigo IS 'Id de la solicitud';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_codigo IS 'Id del ciudadano';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_observaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_observaciones IS 'Observaciones adicionales';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_firma IS 'Tipo de certificado de firma electrónica';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_estado IS 'Estado de la solicitud';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_planilla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_planilla IS 'Indica si cargó el archivo de la planilla de servicios';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_cedula; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_cedula IS 'Indica si subió archivo con la copia de la cédula';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_acuerdo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_acuerdo IS 'Indica si subió el archivo con el acuerdo firmado electrónicamente';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_planilla_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_planilla_estado IS 'Indica si el administrador validó el archivo planilla subido';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_cedula_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_cedula_estado IS 'Indica si el administrador validó el archivo cédula subido';


--
-- Name: COLUMN solicitud_firma_ciudadano.sol_acuerdo_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.sol_acuerdo_estado IS 'Indica si el administrador validó el archivo acuerdo subido';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_nombre IS 'Nombre del ciudadano';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_direccion IS 'Dirección domicilaria';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_empresa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_empresa IS 'Nombre de la empresa';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_cargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_cargo IS 'Cargo que desempeña en su empresa';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_apellido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_apellido IS 'Apellido del ciudadano';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_cedula; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_cedula IS 'Número de cédula';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_telefono; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_telefono IS 'Número telefónico';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_email IS 'Correo electrónico';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_abr_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_abr_titulo IS 'Abreviación del título';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_titulo IS 'Tratamiento o título académico';


--
-- Name: COLUMN solicitud_firma_ciudadano.ciu_documento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitud_firma_ciudadano.ciu_documento IS 'Informacion adicional si no se conoce la cédula';


--
-- Name: datos_solicitud; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.datos_solicitud AS
 SELECT (((solicitud_firma_ciudadano.ciu_nombre)::text || ' '::text) || (solicitud_firma_ciudadano.ciu_apellido)::text) AS ciu_nombre,
    solicitud_firma_ciudadano.ciu_cedula,
    solicitud_firma_ciudadano.ciu_email,
    solicitud_firma_ciudadano.sol_estado,
    solicitud_firma_ciudadano.ciu_codigo
   FROM public.solicitud_firma_ciudadano;


--
-- Name: dependencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dependencia (
    depe_codi integer NOT NULL,
    depe_nomb character varying(150) NOT NULL,
    depe_codi_padre integer,
    dep_sigla character varying(100),
    dep_central integer,
    dep_direccion character varying(100),
    depe_estado smallint,
    inst_codi integer,
    depe_plantilla integer,
    depe_pie1 character varying(150),
    depe_pie2 character varying(150),
    depe_pie3 character varying(150),
    inst_adscrita integer
);


--
-- Name: TABLE dependencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dependencia IS 'Áreas funcionales de las instituciones, estructura orgánica funcional
Tabla recursiva';


--
-- Name: COLUMN dependencia.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.depe_codi IS 'Id del área';


--
-- Name: COLUMN dependencia.depe_nomb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.depe_nomb IS 'Nombre del área';


--
-- Name: COLUMN dependencia.depe_codi_padre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.depe_codi_padre IS 'Id del área padre; código del área superior en el orgánico funcional';


--
-- Name: COLUMN dependencia.dep_sigla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.dep_sigla IS 'Siglas del área';


--
-- Name: COLUMN dependencia.dep_central; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.dep_central IS 'Indica en qué area se encuentra el archivo físico donde se guarda la documentación impresa del área';


--
-- Name: COLUMN dependencia.dep_direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.dep_direccion IS 'Campo en desuso';


--
-- Name: COLUMN dependencia.depe_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.depe_estado IS 'Estado del área';


--
-- Name: COLUMN dependencia.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.inst_codi IS 'Codigo de la institución a la que pertenece';


--
-- Name: COLUMN dependencia.depe_plantilla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.depe_plantilla IS 'Dependencia de la que se copiará la plantilla con que se generan los documentos ';


--
-- Name: COLUMN dependencia.depe_pie1; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.depe_pie1 IS 'Ciudad a la que pertenece el área y que se pondrá por defecto a los usuarios del área';


--
-- Name: COLUMN dependencia.depe_pie2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.depe_pie2 IS 'Campo en desuso';


--
-- Name: COLUMN dependencia.depe_pie3; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.depe_pie3 IS 'Campo en desuso';


--
-- Name: COLUMN dependencia.inst_adscrita; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dependencia.inst_adscrita IS 'Código de la institución adscrita';


--
-- Name: institucion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institucion (
    inst_ruc character varying(14),
    inst_nombre character varying(200),
    inst_logo character varying(100),
    inst_sigla character varying(10),
    inst_pie1 character varying(150),
    inst_pie2 character varying(150),
    inst_pie3 character varying(150),
    inst_codi integer NOT NULL,
    inst_estado integer,
    inst_coordinador smallint DEFAULT 0,
    inst_telefono character varying(30),
    inst_despedida_ofi character varying,
    inst_email character varying(50),
    inst_ws_wsdl character varying(500),
    inst_ws_usuario character varying(100),
    inst_ws_contrasena character varying(100)
);


--
-- Name: TABLE institucion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.institucion IS 'Instituciones registradas';


--
-- Name: COLUMN institucion.inst_ruc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_ruc IS 'RUC de la Institución';


--
-- Name: COLUMN institucion.inst_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_nombre IS 'Nombre de la institución';


--
-- Name: COLUMN institucion.inst_logo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_logo IS 'Path donde se encuentra la imágen con el logo institucional';


--
-- Name: COLUMN institucion.inst_sigla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_sigla IS 'Siglas de la institución';


--
-- Name: COLUMN institucion.inst_pie1; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_pie1 IS 'Campo en desuso';


--
-- Name: COLUMN institucion.inst_pie2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_pie2 IS 'Campo en desuso';


--
-- Name: COLUMN institucion.inst_pie3; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_pie3 IS 'Campo en desuso';


--
-- Name: COLUMN institucion.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_codi IS 'Id';


--
-- Name: COLUMN institucion.inst_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_estado IS 'Estado, activa o inactiva';


--
-- Name: COLUMN institucion.inst_coordinador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_coordinador IS 'Id del ministerio coordinador';


--
-- Name: COLUMN institucion.inst_telefono; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_telefono IS 'Número telefónico';


--
-- Name: COLUMN institucion.inst_despedida_ofi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_despedida_ofi IS 'Frase de despedida por defecto que saldrá en los documentos (Ejm: Dios, Patria y Libertad)';


--
-- Name: COLUMN institucion.inst_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion.inst_email IS 'email para soporte institucional';


--
-- Name: usuarios_usua_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_usua_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    usua_login character varying(50),
    usua_pasw character varying(35),
    usua_nomb character varying(200),
    usua_cedula character varying(50),
    usua_email character varying(500),
    usua_titulo character varying(100),
    usua_abr_titulo character varying(30),
    usua_esta smallint DEFAULT 1,
    usua_codi integer DEFAULT nextval('public.usuarios_usua_codi_seq'::regclass) NOT NULL,
    cargo_tipo smallint DEFAULT 0,
    depe_codi integer,
    usua_nuevo smallint DEFAULT 1,
    usua_tipo smallint DEFAULT 2,
    usua_cargo character varying(200),
    inst_codi integer,
    usua_apellido character varying(200),
    cargo_id integer,
    usua_obs text,
    ciu_codi integer,
    usua_genero character(1),
    usua_firma_path character varying,
    usua_direccion character varying,
    usua_telefono character varying,
    usua_codi_actualiza integer,
    usua_fecha_actualiza timestamp with time zone,
    usua_obs_actualiza character varying,
    usua_cargo_cabecera character varying(200),
    usua_sumilla character varying(50),
    usua_responsable_area integer DEFAULT 0,
    inst_nombre character varying(200),
    usua_tipo_certificado smallint DEFAULT 0,
    visible_sub integer DEFAULT 1,
    usua_subrogado integer,
    usua_celular character varying,
    tipo_identificacion integer DEFAULT 0
);


--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios IS 'Datos de los usuarios del sistema ';


--
-- Name: COLUMN usuarios.usua_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_login IS 'Login del usuario (deben comenzar con "U"); existen usuarios especiales que comienzan con ''UUSR'' y ''UADM''';


--
-- Name: COLUMN usuarios.usua_pasw; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_pasw IS 'Contraseña del usuario en md5';


--
-- Name: COLUMN usuarios.usua_nomb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_nomb IS 'Nombre del usuario';


--
-- Name: COLUMN usuarios.usua_cedula; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_cedula IS 'Número de cédula';


--
-- Name: COLUMN usuarios.usua_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_email IS 'Email, pueden ser varios separados por comas';


--
-- Name: COLUMN usuarios.usua_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_titulo IS 'Tratamiento o título académico';


--
-- Name: COLUMN usuarios.usua_abr_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_abr_titulo IS 'Abreviacion del titulo';


--
-- Name: COLUMN usuarios.usua_esta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_esta IS 'Estado del usuario, activo o inactivo';


--
-- Name: COLUMN usuarios.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_codi IS 'Id del usuario';


--
-- Name: COLUMN usuarios.cargo_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.cargo_tipo IS '0 normal  1 jefe     2  asistente';


--
-- Name: COLUMN usuarios.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.depe_codi IS 'Área a la que pertenece el usuario';


--
-- Name: COLUMN usuarios.usua_nuevo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_nuevo IS 'Determina si el usuario ya cambió su clave del sistema o si se debe enviar el email para cambio de clave';


--
-- Name: COLUMN usuarios.usua_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_tipo IS 'si el usuario es interno o externo';


--
-- Name: COLUMN usuarios.usua_cargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_cargo IS 'Cargo del usuario';


--
-- Name: COLUMN usuarios.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.inst_codi IS 'Institución a la que pertenece el usuario';


--
-- Name: COLUMN usuarios.usua_apellido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_apellido IS 'Apellido del usuario';


--
-- Name: COLUMN usuarios.cargo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.cargo_id IS 'Campo en desuso';


--
-- Name: COLUMN usuarios.usua_obs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_obs IS 'Observaciones sobre el usuario';


--
-- Name: COLUMN usuarios.ciu_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.ciu_codi IS 'Id de la ciudad a la que pertenece el usuario';


--
-- Name: COLUMN usuarios.usua_firma_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_firma_path IS 'Path en el que se encuentra la imágen escaneada de la firma';


--
-- Name: COLUMN usuarios.usua_direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_direccion IS 'Dirección domiciliaria';


--
-- Name: COLUMN usuarios.usua_telefono; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_telefono IS 'Número telefónico';


--
-- Name: COLUMN usuarios.usua_codi_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_codi_actualiza IS 'Id del usuario que realizó la ultima modificación de los datos';


--
-- Name: COLUMN usuarios.usua_fecha_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_fecha_actualiza IS 'Fecha en la que se realizó la última modificación de los datos';


--
-- Name: COLUMN usuarios.usua_obs_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_obs_actualiza IS 'Cambios realizados durante la última modificación del usuario';


--
-- Name: COLUMN usuarios.usua_cargo_cabecera; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_cargo_cabecera IS 'Cargo que se muestra cuando se selecciona al usuario como destinatario';


--
-- Name: COLUMN usuarios.usua_sumilla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_sumilla IS 'Iniciales del usuario utilizadas cuando este tiene responsabilidad en la elaboración de un documento';


--
-- Name: COLUMN usuarios.usua_responsable_area; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_responsable_area IS 'Indica que el usuario es responsable del area, razón por la cual la inicial de sus sumilla se
visualizará en todos los documentos generados en el área y con mayúsculas';


--
-- Name: COLUMN usuarios.inst_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.inst_nombre IS 'Nombre de la institución a la que pertenece el usuario';


--
-- Name: COLUMN usuarios.usua_tipo_certificado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_tipo_certificado IS 'Id del tipo de certificado digital que posee';


--
-- Name: COLUMN usuarios.visible_sub; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.visible_sub IS 'Indica si el usuario ha sido subrogado';


--
-- Name: COLUMN usuarios.usua_subrogado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_subrogado IS 'Id del usuario subrogado';


--
-- Name: COLUMN usuarios.usua_celular; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usua_celular IS 'No. del teléfono celular';


--
-- Name: COLUMN usuarios.tipo_identificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.tipo_identificacion IS '0 cedula  1 pasaporte';


--
-- Name: datos_usuarios; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.datos_usuarios AS
 SELECT u.usua_codi,
    u.usua_cedula,
    u.usua_login,
    u.usua_nomb,
    u.usua_apellido,
    (((COALESCE(u.usua_nomb, ''::character varying))::text || ' '::text) || (COALESCE(u.usua_apellido, ''::character varying))::text) AS usua_nombre,
    u.inst_codi,
        CASE
            WHEN (i.inst_codi = 1) THEN u.inst_nombre
            ELSE i.inst_nombre
        END AS inst_nombre,
    i.inst_estado,
    i.inst_sigla,
    u.usua_cargo,
    u.usua_cargo_cabecera,
    u.usua_titulo,
    u.usua_abr_titulo,
    u.usua_email,
    u.usua_esta,
    u.cargo_tipo,
    u.depe_codi,
    d.depe_nomb,
    d.dep_sigla,
        CASE
            WHEN (i.inst_codi = 1) THEN 2
            ELSE 1
        END AS tipo_usuario,
    u.usua_direccion,
    u.usua_telefono,
    ( SELECT c.nombre
           FROM public.ciudad c
          WHERE (COALESCE(u.ciu_codi, (COALESCE(d.depe_pie1, '1'::character varying))::integer) = c.id)) AS usua_ciudad,
    u.usua_firma_path,
    u.usua_tipo_certificado,
    u.visible_sub
   FROM ((public.usuarios u
     LEFT JOIN public.dependencia d ON ((u.depe_codi = d.depe_codi)))
     LEFT JOIN public.institucion i ON ((i.inst_codi = u.inst_codi)))
UNION ALL
 SELECT u.ciu_codigo AS usua_codi,
    u.ciu_cedula AS usua_cedula,
        CASE
            WHEN (u.ciu_estado = 1) THEN ('U'::text || (u.ciu_cedula)::text)
            ELSE ('l'::text || (u.ciu_codigo)::text)
        END AS usua_login,
    u.ciu_nombre AS usua_nomb,
    u.ciu_apellido AS usua_apellido,
    (((COALESCE(u.ciu_nombre, ''::character varying))::text || ' '::text) || (COALESCE(u.ciu_apellido, ''::character varying))::text) AS usua_nombre,
    0 AS inst_codi,
    u.ciu_empresa AS inst_nombre,
    1 AS inst_estado,
    ''::character varying AS inst_sigla,
    u.ciu_cargo AS usua_cargo,
    u.ciu_cargo AS usua_cargo_cabecera,
    u.ciu_titulo AS usua_titulo,
    u.ciu_abr_titulo AS usua_abr_titulo,
    u.ciu_email AS usua_email,
    u.ciu_estado AS usua_esta,
    0 AS cargo_tipo,
    NULL::integer AS depe_codi,
    NULL::character varying AS depe_nomb,
    NULL::character varying AS dep_sigla,
    2 AS tipo_usuario,
    u.ciu_direccion AS usua_direccion,
    u.ciu_telefono AS usua_telefono,
    ( SELECT c.nombre
           FROM public.ciudad c
          WHERE (COALESCE(u.ciudad_codi, 1) = c.id)) AS usua_ciudad,
    ''::character varying AS usua_firma_path,
    0 AS usua_tipo_certificado,
    0 AS visible_sub
   FROM public.ciudadano u;


--
-- Name: estado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado (
    esta_codi smallint NOT NULL,
    esta_desc character varying(100) NOT NULL
);


--
-- Name: TABLE estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.estado IS 'Estados en los que puede estar un documento';


--
-- Name: COLUMN estado.esta_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estado.esta_codi IS 'ESTA_CODI';


--
-- Name: COLUMN estado.esta_desc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estado.esta_desc IS 'ESTA_DESC';


--
-- Name: formato_numeracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formato_numeracion (
    fn_abr_texto character varying(10),
    fn_formato character varying(45),
    depe_codi integer NOT NULL,
    fn_caracter character varying(5) DEFAULT '-'::character varying,
    fn_num_consec smallint DEFAULT 4,
    fn_num_anio smallint DEFAULT 4,
    depe_numeracion integer,
    fn_contador integer DEFAULT 0,
    fn_tiporad smallint NOT NULL
);


--
-- Name: TABLE formato_numeracion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.formato_numeracion IS 'Maneja los formatos de la numeración y los números secuenciales de los documentos';


--
-- Name: COLUMN formato_numeracion.fn_abr_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.fn_abr_texto IS 'Abreviatura del tipo de documento';


--
-- Name: COLUMN formato_numeracion.fn_formato; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.fn_formato IS 'Formato de la numeración';


--
-- Name: COLUMN formato_numeracion.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.depe_codi IS 'Área a la que pertenece ese formato; cada área puede tener su propio formato de numeración';


--
-- Name: COLUMN formato_numeracion.fn_caracter; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.fn_caracter IS 'Caracter que servirá para separar la numeración; por defecto "-"';


--
-- Name: COLUMN formato_numeracion.fn_num_consec; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.fn_num_consec IS 'Número de digitos con los que se mostrará número secuencial';


--
-- Name: COLUMN formato_numeracion.fn_num_anio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.fn_num_anio IS 'Numero de digitos con los que se mostrará el año';


--
-- Name: COLUMN formato_numeracion.depe_numeracion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.depe_numeracion IS 'Dependencia de la que se tomará el formato y la numeración, en el caso que se desee utilizar la de otra área';


--
-- Name: COLUMN formato_numeracion.fn_contador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.fn_contador IS 'Secuencia actual del documento';


--
-- Name: COLUMN formato_numeracion.fn_tiporad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.formato_numeracion.fn_tiporad IS 'Tipo de documento (oficio, memo, etc.)';


--
-- Name: hist_envio_fisico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hist_envio_fisico (
    hist_fech_envio character varying(50),
    hist_codi numeric(30,0) NOT NULL,
    radi_nume_radi numeric(20,0) NOT NULL,
    usua_codi_enviado integer NOT NULL,
    usua_responsable character varying(150) NOT NULL,
    estado character varying NOT NULL,
    estadoenvio bit(1) DEFAULT '0'::"bit" NOT NULL,
    his_id integer NOT NULL
);


--
-- Name: TABLE hist_envio_fisico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hist_envio_fisico IS 'Registro de los traspasos físicos de documentos de una persona a otra';


--
-- Name: COLUMN hist_envio_fisico.hist_fech_envio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_envio_fisico.hist_fech_envio IS 'Fecha del traspaso';


--
-- Name: COLUMN hist_envio_fisico.hist_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_envio_fisico.hist_codi IS 'Id de la transacción en hist_eventos';


--
-- Name: COLUMN hist_envio_fisico.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_envio_fisico.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN hist_envio_fisico.usua_codi_enviado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_envio_fisico.usua_codi_enviado IS 'Destinatario del documento';


--
-- Name: COLUMN hist_envio_fisico.usua_responsable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_envio_fisico.usua_responsable IS 'Responsable del traslado';


--
-- Name: COLUMN hist_envio_fisico.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_envio_fisico.estado IS 'Estado (material) en el que se encuentra el documento físico enviado
B - Bueno
M - Malo
R - Regular';


--
-- Name: COLUMN hist_envio_fisico.estadoenvio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_envio_fisico.estadoenvio IS 'Indica el estado de la acción de envío, enviado o no enviado';


--
-- Name: COLUMN hist_envio_fisico.his_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_envio_fisico.his_id IS 'Id';


--
-- Name: hist_envio_fisico_his_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hist_envio_fisico_his_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hist_envio_fisico_his_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hist_envio_fisico_his_id_seq1 OWNED BY public.hist_envio_fisico.his_id;


--
-- Name: hist_opc_impresion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hist_opc_impresion (
    hist_fech_impresion timestamp with time zone,
    hist_codi integer NOT NULL,
    radi_nume_radi numeric(20,0),
    usua_codi_ori integer,
    hist_observacion character varying,
    id_transaccion character varying
);


--
-- Name: TABLE hist_opc_impresion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hist_opc_impresion IS 'Log de cambios de las opciones de impresión';


--
-- Name: COLUMN hist_opc_impresion.hist_fech_impresion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_opc_impresion.hist_fech_impresion IS 'Fecha que realizó el cambio en opciones de impresión';


--
-- Name: COLUMN hist_opc_impresion.hist_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_opc_impresion.hist_codi IS 'Id';


--
-- Name: COLUMN hist_opc_impresion.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_opc_impresion.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN hist_opc_impresion.usua_codi_ori; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_opc_impresion.usua_codi_ori IS 'usuario que realiza el cambio';


--
-- Name: COLUMN hist_opc_impresion.hist_observacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_opc_impresion.hist_observacion IS 'Detalle de los cambios realizados';


--
-- Name: COLUMN hist_opc_impresion.id_transaccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hist_opc_impresion.id_transaccion IS 'Si es insert o update';


--
-- Name: hist_opc_impresion_hist_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hist_opc_impresion_hist_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hist_opc_impresion_hist_codi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hist_opc_impresion_hist_codi_seq OWNED BY public.hist_opc_impresion.hist_codi;


--
-- Name: institucion_coordinador_inst_coor_codi_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institucion_coordinador_inst_coor_codi_seq1
    START WITH 3
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institucion_coordinador; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institucion_coordinador (
    inst_coor_codi integer DEFAULT nextval('public.institucion_coordinador_inst_coor_codi_seq1'::regclass) NOT NULL,
    inst_codi_coor integer NOT NULL,
    inst_codi integer NOT NULL,
    inst_coor_fecha timestamp with time zone NOT NULL
);


--
-- Name: TABLE institucion_coordinador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.institucion_coordinador IS 'Instituciones Coordinadoras (se la utiliza en otros sistemas)';


--
-- Name: COLUMN institucion_coordinador.inst_coor_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_coordinador.inst_coor_codi IS 'Id';


--
-- Name: COLUMN institucion_coordinador.inst_codi_coor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_coordinador.inst_codi_coor IS 'Codigo de la dependencia coordinadora';


--
-- Name: COLUMN institucion_coordinador.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_coordinador.inst_codi IS 'Codigo de la dependencia';


--
-- Name: COLUMN institucion_coordinador.inst_coor_fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_coordinador.inst_coor_fecha IS 'Fecha de ultima actualizacion';


--
-- Name: institucion_org; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institucion_org (
    org_id integer NOT NULL,
    org_id_padre integer,
    inst_codi integer NOT NULL,
    fecha_registro timestamp with time zone,
    depe_codi integer
);


--
-- Name: TABLE institucion_org; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.institucion_org IS 'Organigrama de las instituciones del estado';


--
-- Name: COLUMN institucion_org.org_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_org.org_id IS 'Id';


--
-- Name: COLUMN institucion_org.org_id_padre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_org.org_id_padre IS 'Id de la entidad padre';


--
-- Name: COLUMN institucion_org.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_org.inst_codi IS 'Código de la institución';


--
-- Name: COLUMN institucion_org.fecha_registro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_org.fecha_registro IS 'Fecha de registro';


--
-- Name: COLUMN institucion_org.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institucion_org.depe_codi IS 'Código del área padre';


--
-- Name: lista_lista_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lista_lista_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lista; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lista (
    lista_codi bigint DEFAULT nextval('public.lista_lista_id_seq'::regclass) NOT NULL,
    lista_nombre character varying(250),
    lista_descripcion character varying(200),
    inst_codi integer,
    usua_codi integer,
    lista_fecha timestamp with time zone,
    lista_orden smallint DEFAULT 0,
    lista_estado smallint DEFAULT 1,
    lista_usua_codi integer
);


--
-- Name: TABLE lista; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lista IS 'Listas de usuarios para facilitar el envío de documentación';


--
-- Name: COLUMN lista.lista_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.lista_codi IS 'Id';


--
-- Name: COLUMN lista.lista_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.lista_nombre IS 'Nombre de la lista';


--
-- Name: COLUMN lista.lista_descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.lista_descripcion IS 'Descripción de la lista';


--
-- Name: COLUMN lista.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.inst_codi IS 'Id de la institución';


--
-- Name: COLUMN lista.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.usua_codi IS 'Id del usuario al que pertenece la lista (0 para listas públicas)';


--
-- Name: COLUMN lista.lista_fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.lista_fecha IS 'Fecha de ultima actualizacion';


--
-- Name: COLUMN lista.lista_orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.lista_orden IS 'Orden en el que se mostrarán los usuarios de la lista (alfabético o por órden de selección)';


--
-- Name: COLUMN lista.lista_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.lista_estado IS 'Estado de la lista: activo o inactivo';


--
-- Name: COLUMN lista.lista_usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista.lista_usua_codi IS 'Id del usuario que modificó la lista';


--
-- Name: lista_usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lista_usuarios (
    lista_codi bigint NOT NULL,
    usua_codi integer NOT NULL,
    orden integer
);


--
-- Name: TABLE lista_usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lista_usuarios IS 'Relación entre las tablas de usuarios y listas';


--
-- Name: COLUMN lista_usuarios.lista_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista_usuarios.lista_codi IS 'Id de la lista';


--
-- Name: COLUMN lista_usuarios.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista_usuarios.usua_codi IS 'Id del usuario';


--
-- Name: COLUMN lista_usuarios.orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lista_usuarios.orden IS 'Número en base al cual se ordenan los usuarios';


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
-- Name: log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log (
    log_id bigint DEFAULT nextval('public.log_log_id_seq'::regclass) NOT NULL,
    fecha timestamp with time zone,
    usua_codi integer,
    tabla character varying(100),
    sentencia character varying,
    tipo smallint
);


--
-- Name: TABLE log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log IS 'Log de transacciones del sistema, almacena los queries más importantes ejecutados el la BDD';


--
-- Name: COLUMN log.log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log.log_id IS 'Id';


--
-- Name: COLUMN log.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log.fecha IS 'Fecha en la que se realizo la accion';


--
-- Name: COLUMN log.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log.usua_codi IS 'Id del usuario que realizó la acción';


--
-- Name: COLUMN log.tabla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log.tabla IS 'Nombre de la tabla que se modifico';


--
-- Name: COLUMN log.sentencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log.sentencia IS 'Query que se ejecuto';


--
-- Name: COLUMN log.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log.tipo IS 'Tipo de log:
0 - Error
1 - Update
2 - Insert';


--
-- Name: sec_log_acceso; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_log_acceso
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_acceso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_acceso (
    log_codi bigint DEFAULT nextval('public.sec_log_acceso'::regclass) NOT NULL,
    fecha timestamp with time zone,
    usuario character varying(50),
    ip character varying(300),
    intentos integer,
    acceso smallint
);


--
-- Name: TABLE log_acceso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_acceso IS 'Log de los accesos e intentos de acceso de los usuarios al sistema';


--
-- Name: COLUMN log_acceso.log_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_acceso.log_codi IS 'Id';


--
-- Name: COLUMN log_acceso.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_acceso.fecha IS 'Fecha de acceso';


--
-- Name: COLUMN log_acceso.usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_acceso.usuario IS 'Login del usuario con el que se intento ingresar';


--
-- Name: COLUMN log_acceso.ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_acceso.ip IS 'Ip de la máquina del cliente';


--
-- Name: COLUMN log_acceso.intentos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_acceso.intentos IS 'No. de intento de acceso';


--
-- Name: COLUMN log_acceso.acceso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_acceso.acceso IS 'Bandera que indica si el usuario ingresó al sistema o no';


--
-- Name: log_archivo_descarga; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_archivo_descarga (
    log_codi bigint NOT NULL,
    fecha timestamp with time zone,
    usua_codi integer,
    radi_nume_radi numeric(20,0),
    anex_codigo character varying(50),
    arch_tipo smallint DEFAULT 0,
    tipo_descarga character varying(10)
);


--
-- Name: TABLE log_archivo_descarga; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_archivo_descarga IS 'Guarda un registro de todos los archivos que son descargados en el sistema';


--
-- Name: COLUMN log_archivo_descarga.log_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_archivo_descarga.log_codi IS 'Id';


--
-- Name: COLUMN log_archivo_descarga.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_archivo_descarga.fecha IS 'Fecha de la descarga';


--
-- Name: COLUMN log_archivo_descarga.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_archivo_descarga.usua_codi IS 'Usuario que descargó el archivo';


--
-- Name: COLUMN log_archivo_descarga.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_archivo_descarga.radi_nume_radi IS 'Número de documento al que pertenece el archivo';


--
-- Name: COLUMN log_archivo_descarga.anex_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_archivo_descarga.anex_codigo IS 'Código del anexo si es que era un adjunto o una imágen digitalizada';


--
-- Name: COLUMN log_archivo_descarga.arch_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_archivo_descarga.arch_tipo IS 'Define si se descarga un archivo firmado electrónicamente o un archivo sin firma';


--
-- Name: COLUMN log_archivo_descarga.tipo_descarga; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_archivo_descarga.tipo_descarga IS 'Tipo de descarga: descarga, embebido y embebido con acrobat reader';


--
-- Name: log_archivo_descarga_log_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_archivo_descarga_log_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_archivo_descarga_log_codi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_archivo_descarga_log_codi_seq OWNED BY public.log_archivo_descarga.log_codi;


--
-- Name: sec_log_bloqueos_dos; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_log_bloqueos_dos
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_bloqueos_dos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_bloqueos_dos (
    log_codi bigint DEFAULT nextval('public.sec_log_bloqueos_dos'::regclass) NOT NULL,
    fecha timestamp with time zone,
    usua_codi integer,
    pagina character varying(500),
    navegador character varying(500),
    ip character varying(100),
    num_accesos integer
);


--
-- Name: TABLE log_bloqueos_dos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_bloqueos_dos IS 'Registra los usuarios que fueron bloqueados en el sistema por realizar muchas peticiones en un tiempo muy corto';


--
-- Name: COLUMN log_bloqueos_dos.log_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_bloqueos_dos.log_codi IS 'Id';


--
-- Name: COLUMN log_bloqueos_dos.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_bloqueos_dos.fecha IS 'Fecha y hora del bloqueo';


--
-- Name: COLUMN log_bloqueos_dos.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_bloqueos_dos.usua_codi IS 'Código del usuario bloqueado';


--
-- Name: COLUMN log_bloqueos_dos.pagina; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_bloqueos_dos.pagina IS 'Página a la que intentó acceder el usuario';


--
-- Name: COLUMN log_bloqueos_dos.navegador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_bloqueos_dos.navegador IS 'Datos del navegador del usuario';


--
-- Name: COLUMN log_bloqueos_dos.ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_bloqueos_dos.ip IS 'IP desde la que se conectó el usuario';


--
-- Name: COLUMN log_bloqueos_dos.num_accesos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_bloqueos_dos.num_accesos IS 'Número de peticiones realizadas antes del bloqueo';


--
-- Name: sec_log_full_backup; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_log_full_backup
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_full_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_full_backup (
    log_codi bigint DEFAULT nextval('public.sec_log_full_backup'::regclass) NOT NULL,
    sentencia character varying,
    fecha timestamp with time zone DEFAULT now(),
    estado smallint DEFAULT 0
);


--
-- Name: TABLE log_full_backup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_full_backup IS 'Log en el que se guardan todas las sentencias ejecutadas en la BDD.
Se la utilizó temporalmente para sincronizar BDD postgres 9.1 y 8.2 durante el upgrade de versión';


--
-- Name: COLUMN log_full_backup.log_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_full_backup.log_codi IS 'Id';


--
-- Name: COLUMN log_full_backup.sentencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_full_backup.sentencia IS 'Sentencia ejecutada, almacenada en base 64';


--
-- Name: COLUMN log_full_backup.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_full_backup.fecha IS 'Fecha de ejecución del script';


--
-- Name: COLUMN log_full_backup.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_full_backup.estado IS 'Bandera utilizada en la sincronización para saber si el query ya se ejecutó en la otra BDD';


--
-- Name: log_matar_procesos_servidores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_matar_procesos_servidores (
    log_codi bigint NOT NULL,
    fecha timestamp with time zone,
    servidor character varying(20),
    cliente character varying(20),
    numero_procesos integer,
    pagina character varying(200)
);


--
-- Name: log_matar_procesos_servidores_log_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_matar_procesos_servidores_log_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_matar_procesos_servidores_log_codi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_matar_procesos_servidores_log_codi_seq OWNED BY public.log_matar_procesos_servidores.log_codi;


--
-- Name: sec_log_paginas_visitadas; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_log_paginas_visitadas
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_paginas_visitadas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_paginas_visitadas (
    log_codi bigint DEFAULT nextval('public.sec_log_paginas_visitadas'::regclass) NOT NULL,
    fecha timestamp with time zone,
    usuario character varying(50),
    ip character varying(300),
    pagina character varying(500)
);


--
-- Name: TABLE log_paginas_visitadas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_paginas_visitadas IS 'Log de las páginas a las que han accedido los usuarios';


--
-- Name: COLUMN log_paginas_visitadas.log_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_paginas_visitadas.log_codi IS 'Id';


--
-- Name: COLUMN log_paginas_visitadas.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_paginas_visitadas.fecha IS 'Fecha de acceso';


--
-- Name: COLUMN log_paginas_visitadas.usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_paginas_visitadas.usuario IS 'Id del usuario que llamó a la página';


--
-- Name: COLUMN log_paginas_visitadas.ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_paginas_visitadas.ip IS 'Ip del usuario';


--
-- Name: COLUMN log_paginas_visitadas.pagina; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_paginas_visitadas.pagina IS 'página a la que se accedió';


--
-- Name: log_sesion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_sesion (
    fecha timestamp with time zone NOT NULL,
    usuario character varying(50),
    descripcion character varying(300)
);


--
-- Name: TABLE log_sesion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_sesion IS 'Log de pérdidas de sesión';


--
-- Name: COLUMN log_sesion.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_sesion.fecha IS 'Fecha en la que se perdió la sesión';


--
-- Name: COLUMN log_sesion.usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_sesion.usuario IS 'Id de la sesión o del usuario';


--
-- Name: COLUMN log_sesion.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_sesion.descripcion IS 'Descripción del motivo por el que se cerró la sesión';


--
-- Name: log_tiempo_ws_firma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_tiempo_ws_firma (
    radi_nume_radi numeric(20,0) NOT NULL,
    t1 timestamp with time zone,
    t2 timestamp with time zone,
    t3 timestamp with time zone,
    t4 timestamp with time zone,
    t5 timestamp with time zone,
    t6 timestamp with time zone
);


--
-- Name: log_user_permisos_id_transaccion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_user_permisos_id_transaccion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_usr_ciudadanos_logc_codigo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_usr_ciudadanos_logc_codigo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_usr_ciudadanos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_usr_ciudadanos (
    usua_codi integer,
    usua_codi_ori integer,
    logc_observacion character varying,
    fecha_cambio timestamp with time zone,
    logc_tabla_modificada integer,
    id_transaccion integer,
    logc_codi integer DEFAULT nextval('public.log_usr_ciudadanos_logc_codigo_seq'::regclass) NOT NULL
);


--
-- Name: TABLE log_usr_ciudadanos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_usr_ciudadanos IS 'Log de modificaciones de las tablas usuarios, ciudadano, ciudadano_tmp y solicitud_firma';


--
-- Name: COLUMN log_usr_ciudadanos.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_ciudadanos.usua_codi IS 'Id del usuario modificado';


--
-- Name: COLUMN log_usr_ciudadanos.usua_codi_ori; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_ciudadanos.usua_codi_ori IS 'Id del usuario que realizó el cambio';


--
-- Name: COLUMN log_usr_ciudadanos.logc_observacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_ciudadanos.logc_observacion IS 'Cambios realizados';


--
-- Name: COLUMN log_usr_ciudadanos.fecha_cambio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_ciudadanos.fecha_cambio IS 'Fecha en la que se realizó el cambio';


--
-- Name: COLUMN log_usr_ciudadanos.logc_tabla_modificada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_ciudadanos.logc_tabla_modificada IS '1 ciudadanos,2 usuarios,3 solicitud_firma,4 ciudadano_tmp';


--
-- Name: COLUMN log_usr_ciudadanos.id_transaccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_ciudadanos.id_transaccion IS 'Tipo de transacción (Insert o Update)';


--
-- Name: COLUMN log_usr_ciudadanos.logc_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_ciudadanos.logc_codi IS 'Id de la tabla';


--
-- Name: log_usr_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_usr_permisos (
    id_transaccion integer DEFAULT nextval('public.log_user_permisos_id_transaccion_seq'::regclass) NOT NULL,
    usua_codi integer,
    usua_codi_actualiza integer,
    accion integer,
    id_permiso integer,
    fecha_actualiza timestamp with time zone
);


--
-- Name: TABLE log_usr_permisos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_usr_permisos IS 'Log de cambios en los permisos de los usuarios';


--
-- Name: COLUMN log_usr_permisos.id_transaccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_permisos.id_transaccion IS 'Id de la tabla';


--
-- Name: COLUMN log_usr_permisos.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_permisos.usua_codi IS 'Código del usuario modificado';


--
-- Name: COLUMN log_usr_permisos.usua_codi_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_permisos.usua_codi_actualiza IS 'Código del usuario que realizó el cambio';


--
-- Name: COLUMN log_usr_permisos.accion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_permisos.accion IS 'Tipo de acción: asignar o quitar el permiso';


--
-- Name: COLUMN log_usr_permisos.id_permiso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_permisos.id_permiso IS 'Id del permiso';


--
-- Name: COLUMN log_usr_permisos.fecha_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_usr_permisos.fecha_actualiza IS 'Fecha en la que se realizó el cambio';


--
-- Name: log_view_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_view_usuario (
    log_codi bigint NOT NULL,
    fecha timestamp with time zone,
    tabla character varying(50),
    accion character varying(50),
    codigo integer,
    error character varying,
    corregido smallint DEFAULT 0
);


--
-- Name: TABLE log_view_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.log_view_usuario IS 'Log en el que se guardan los errores ocurridos al actualizar la vista materializada USUARIO';


--
-- Name: COLUMN log_view_usuario.log_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_view_usuario.log_codi IS 'Id de la tabla';


--
-- Name: COLUMN log_view_usuario.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_view_usuario.fecha IS 'Fecha de en la que se actualizó el usuario';


--
-- Name: COLUMN log_view_usuario.tabla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_view_usuario.tabla IS 'Tabla que fue modificada';


--
-- Name: COLUMN log_view_usuario.accion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_view_usuario.accion IS 'Acción realizada (Insert o Update)';


--
-- Name: COLUMN log_view_usuario.codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_view_usuario.codigo IS 'Id del usuario, ciudadano, institución, área o ciudad';


--
-- Name: COLUMN log_view_usuario.error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_view_usuario.error IS 'Descripción del error ocurrido';


--
-- Name: COLUMN log_view_usuario.corregido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.log_view_usuario.corregido IS 'Bandera que indica si se tomaron acciones para corregir el error en los datos de la vista';


--
-- Name: log_view_usuario_log_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_view_usuario_log_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_view_usuario_log_codi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_view_usuario_log_codi_seq OWNED BY public.log_view_usuario.log_codi;


--
-- Name: sec_mail_notificacion; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_mail_notificacion
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mail_notificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mail_notificacion (
    mail_codi integer DEFAULT nextval('public.sec_mail_notificacion'::regclass) NOT NULL,
    fecha_registro timestamp with time zone,
    fecha_envio timestamp with time zone,
    usua_remite integer DEFAULT 0,
    asunto character varying,
    mensaje character varying,
    estado smallint
);


--
-- Name: TABLE mail_notificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mail_notificacion IS 'Envío de correos electrónicos a los usuarios de Quipux';


--
-- Name: COLUMN mail_notificacion.mail_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_notificacion.mail_codi IS 'Id de la tabla';


--
-- Name: COLUMN mail_notificacion.fecha_registro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_notificacion.fecha_registro IS 'Fecha en la que se redactó el correo';


--
-- Name: COLUMN mail_notificacion.fecha_envio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_notificacion.fecha_envio IS 'Fecha en la que se envió el correo';


--
-- Name: COLUMN mail_notificacion.usua_remite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_notificacion.usua_remite IS 'Id del usuarrio remitente';


--
-- Name: COLUMN mail_notificacion.asunto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_notificacion.asunto IS 'Asunto del mensaje';


--
-- Name: COLUMN mail_notificacion.mensaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_notificacion.mensaje IS 'Texto del correo en formato HTML';


--
-- Name: COLUMN mail_notificacion.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mail_notificacion.estado IS 'Estado del envío';


--
-- Name: metadatos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metadatos (
    met_codi bigint NOT NULL,
    met_padre bigint NOT NULL,
    inst_codi integer,
    depe_codi integer,
    met_nombre character varying(250) NOT NULL,
    met_nivel smallint DEFAULT 0,
    met_estado smallint DEFAULT 0
);


--
-- Name: TABLE metadatos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.metadatos IS 'Almacena una categoría de datos a manera de árbol por cada institución.';


--
-- Name: COLUMN metadatos.met_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos.met_codi IS 'Id primario.';


--
-- Name: COLUMN metadatos.met_padre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos.met_padre IS 'Id del metadato al cual pertenece el registro actual.';


--
-- Name: COLUMN metadatos.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos.inst_codi IS 'Id de la Institución al que pertenece el metadato.';


--
-- Name: COLUMN metadatos.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos.depe_codi IS 'Id de la dependencia a la que pertenece el metadato.';


--
-- Name: COLUMN metadatos.met_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos.met_nombre IS 'Indica el nombre del metadato';


--
-- Name: COLUMN metadatos.met_nivel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos.met_nivel IS 'Indica el nivel en el que se encuentra dentro del árbol';


--
-- Name: COLUMN metadatos.met_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos.met_estado IS 'Indica si el metadato está activo';


--
-- Name: sec_metadatos_radi; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_metadatos_radi
    START WITH 1
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


--
-- Name: metadatos_radicado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metadatos_radicado (
    met_radi_codi bigint DEFAULT nextval('public.sec_metadatos_radi'::regclass) NOT NULL,
    radi_nume_radi numeric(20,0) NOT NULL,
    met_codi bigint NOT NULL,
    depe_codi integer,
    usua_codi integer,
    texto character varying(250),
    metadato character varying NOT NULL,
    metadato_texto character varying NOT NULL,
    metadato_codi character varying(250) NOT NULL,
    fecha timestamp with time zone,
    estado integer DEFAULT 1
);


--
-- Name: TABLE metadatos_radicado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.metadatos_radicado IS 'Almacena el metadato utilizado por cada documento en la respectiva dependencia.';


--
-- Name: COLUMN metadatos_radicado.met_radi_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.met_radi_codi IS 'Id primario.';


--
-- Name: COLUMN metadatos_radicado.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.radi_nume_radi IS 'Id del documento asociado con el metadato.';


--
-- Name: COLUMN metadatos_radicado.met_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.met_codi IS 'Id del metadato.';


--
-- Name: COLUMN metadatos_radicado.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.depe_codi IS 'Id de la dependencia.';


--
-- Name: COLUMN metadatos_radicado.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.usua_codi IS 'Id del usuario que asocia el metadato al documento.';


--
-- Name: COLUMN metadatos_radicado.texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.texto IS 'Descripción personalizada que ingresa el usuario, como adicional al metadato.';


--
-- Name: COLUMN metadatos_radicado.metadato; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.metadato IS 'Descripción del metadato seleccionado.';


--
-- Name: COLUMN metadatos_radicado.metadato_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.metadato_texto IS 'Descripción del metadato seleccionado y el texto ingresado por el usuario.';


--
-- Name: COLUMN metadatos_radicado.metadato_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.metadato_codi IS 'Id''s de los metadatos seleccionados separados por (,) como respaldo.';


--
-- Name: COLUMN metadatos_radicado.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.fecha IS 'Fecha en la que se asocia el metadato al documento.';


--
-- Name: COLUMN metadatos_radicado.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metadatos_radicado.estado IS 'Estado para eliminado lógico de registro. 1: True o Activo, 2: False o Inactivo.';


--
-- Name: nombres_usuarios; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.nombres_usuarios AS
 SELECT usuarios.usua_codi,
    (((COALESCE(usuarios.usua_nomb, ''::character varying))::text || ' '::text) || (COALESCE(usuarios.usua_apellido, ''::character varying))::text) AS usua_nombre,
    usuarios.usua_cedula,
    usuarios.depe_codi,
    usuarios.inst_codi,
    usuarios.usua_esta
   FROM public.usuarios
  WHERE (usuarios.usua_codi > 0)
UNION ALL
 SELECT ciudadano.ciu_codigo AS usua_codi,
    (((COALESCE(ciudadano.ciu_nombre, ''::character varying))::text || ' '::text) || (COALESCE(ciudadano.ciu_apellido, ''::character varying))::text) AS usua_nombre,
    ciudadano.ciu_cedula AS usua_cedula,
    0 AS depe_codi,
    0 AS inst_codi,
    ciudadano.ciu_estado AS usua_esta
   FROM public.ciudadano;


--
-- Name: opciones_impresion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opciones_impresion (
    opc_imp_codi integer NOT NULL,
    radi_nume_radi numeric(20,0) NOT NULL,
    opc_imp_ocultar_nume_radi smallint DEFAULT 0,
    opc_imp_mostrar_para smallint DEFAULT 0,
    opc_imp_justificar_firma smallint DEFAULT 0,
    opc_imp_titulo_natural character varying,
    opc_imp_ext_institucion character varying,
    opc_imp_destino_destinatario character varying,
    opc_imp_frase_remitente character varying,
    opc_imp_despedida character varying,
    opc_imp_firmantes character varying,
    opc_imp_ocultar_frase_rem smallint DEFAULT 0,
    opc_imp_cargo_cabecera character varying,
    opc_imp_tipo_nota smallint DEFAULT 0,
    opc_imp_justificar_fecha smallint DEFAULT 2,
    opc_imp_ocultar_asunto smallint DEFAULT 0,
    opc_imp_letra_italica smallint DEFAULT 0,
    opc_imp_ocultar_atentamente smallint DEFAULT 0,
    opc_imp_ocultar_anexo smallint DEFAULT 0,
    opc_imp_ocultar_referencia smallint DEFAULT 0,
    opc_imp_ocultar_sumillas smallint DEFAULT 0,
    opc_imp_texto_sobre character varying,
    opc_imp_ciudad_dado_en character varying(100)
);


--
-- Name: TABLE opciones_impresion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.opciones_impresion IS 'Guarda los datos de las opciones de impresión';


--
-- Name: COLUMN opciones_impresion.opc_imp_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_codi IS 'Id';


--
-- Name: COLUMN opciones_impresion.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN opciones_impresion.opc_imp_ocultar_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_ocultar_nume_radi IS 'Oculta el número de documento';


--
-- Name: COLUMN opciones_impresion.opc_imp_mostrar_para; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_mostrar_para IS 'Pone los datos del destinatario al pie de página';


--
-- Name: COLUMN opciones_impresion.opc_imp_justificar_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_justificar_firma IS 'Pone los datos del firmante centrados o a la izquierda';


--
-- Name: COLUMN opciones_impresion.opc_imp_titulo_natural; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_titulo_natural IS 'Modifica el título del destinatario (solo para imprimir)';


--
-- Name: COLUMN opciones_impresion.opc_imp_ext_institucion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_ext_institucion IS 'Añade un texto al final del nombre de la institución';


--
-- Name: COLUMN opciones_impresion.opc_imp_destino_destinatario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_destino_destinatario IS 'Ubicación geográfica del destinatario, va como parte del saludo (Ejm: Presente, En su despacho, Ciudad, etc.)';


--
-- Name: COLUMN opciones_impresion.opc_imp_frase_remitente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_frase_remitente IS 'Frase del remitente (Ejm: DIOS, PATRIA Y LIBERTAD)';


--
-- Name: COLUMN opciones_impresion.opc_imp_despedida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_despedida IS 'Frase de despedida (Ejm: "Atentamente,")';


--
-- Name: COLUMN opciones_impresion.opc_imp_firmantes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_firmantes IS 'Añade un texto al final del nombre del destinatario';


--
-- Name: COLUMN opciones_impresion.opc_imp_ocultar_frase_rem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_ocultar_frase_rem IS 'Oculta la frase del remitente';


--
-- Name: COLUMN opciones_impresion.opc_imp_cargo_cabecera; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_cargo_cabecera IS 'Modifica el cargo del destinatario (solo para imprimir)';


--
-- Name: COLUMN opciones_impresion.opc_imp_tipo_nota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_tipo_nota IS 'Indica que tipo de nota consular es:
0 - Verbal
1 - Diplomática
2 - Reversal';


--
-- Name: COLUMN opciones_impresion.opc_imp_justificar_fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_justificar_fecha IS 'Campo en deshuso';


--
-- Name: COLUMN opciones_impresion.opc_imp_ocultar_asunto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_ocultar_asunto IS 'Oculta la línea del asunto';


--
-- Name: COLUMN opciones_impresion.opc_imp_letra_italica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_letra_italica IS 'Imprime el documento con letra cursiva';


--
-- Name: COLUMN opciones_impresion.opc_imp_ocultar_atentamente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_ocultar_atentamente IS 'Oculta la frase de despedida';


--
-- Name: COLUMN opciones_impresion.opc_imp_ocultar_anexo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_ocultar_anexo IS 'Oculta las líneas de anexos';


--
-- Name: COLUMN opciones_impresion.opc_imp_ocultar_referencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_ocultar_referencia IS 'Oculta las referencias';


--
-- Name: COLUMN opciones_impresion.opc_imp_ocultar_sumillas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_ocultar_sumillas IS 'Oculta las sumillas de los responsables de la elaboración del documento';


--
-- Name: COLUMN opciones_impresion.opc_imp_texto_sobre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion.opc_imp_texto_sobre IS 'Campo en deshuso';


--
-- Name: opciones_impresion_opc_imp_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opciones_impresion_opc_imp_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opciones_impresion_opc_imp_codi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opciones_impresion_opc_imp_codi_seq OWNED BY public.opciones_impresion.opc_imp_codi;


--
-- Name: opciones_impresion_sobre; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opciones_impresion_sobre (
    opc_imp_sob_codi integer NOT NULL,
    radi_nume_radi numeric(20,0),
    usua_codi integer,
    opc_imp_sob_direccion character varying,
    opc_imp_sob_ciudad integer,
    opc_imp_sob_telefono character varying
);


--
-- Name: TABLE opciones_impresion_sobre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.opciones_impresion_sobre IS 'Datos para la impresión de sobres';


--
-- Name: COLUMN opciones_impresion_sobre.opc_imp_sob_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion_sobre.opc_imp_sob_codi IS 'Id';


--
-- Name: COLUMN opciones_impresion_sobre.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion_sobre.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN opciones_impresion_sobre.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion_sobre.usua_codi IS 'Id del usuario responsable';


--
-- Name: COLUMN opciones_impresion_sobre.opc_imp_sob_direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion_sobre.opc_imp_sob_direccion IS 'Dirección del destinatario';


--
-- Name: COLUMN opciones_impresion_sobre.opc_imp_sob_ciudad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion_sobre.opc_imp_sob_ciudad IS 'Ciudad del destinatario';


--
-- Name: COLUMN opciones_impresion_sobre.opc_imp_sob_telefono; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.opciones_impresion_sobre.opc_imp_sob_telefono IS 'Teléfono del destinatario';


--
-- Name: opciones_impresion_sobre_opc_imp_sob_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opciones_impresion_sobre_opc_imp_sob_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opciones_impresion_sobre_opc_imp_sob_codi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opciones_impresion_sobre_opc_imp_sob_codi_seq OWNED BY public.opciones_impresion_sobre.opc_imp_sob_codi;


--
-- Name: permisos_id_permiso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permisos_id_permiso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permiso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permiso (
    id_permiso integer DEFAULT nextval('public.permisos_id_permiso_seq'::regclass) NOT NULL,
    descripcion character varying(100),
    estado smallint,
    orden smallint,
    nombre character varying(100),
    descripcion_larga character varying,
    perfil smallint DEFAULT 0
);


--
-- Name: TABLE permiso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permiso IS 'Catálogo de los permisos de los usuarios en el sistema';


--
-- Name: COLUMN permiso.id_permiso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso.id_permiso IS 'Id';


--
-- Name: COLUMN permiso.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso.descripcion IS 'Descripción corta del permiso';


--
-- Name: COLUMN permiso.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso.estado IS 'Estado:
0 = Inactivo
1 = Activo';


--
-- Name: COLUMN permiso.orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso.orden IS 'Orden en el que deben aparecer los permisos en la pantalla de administración';


--
-- Name: COLUMN permiso.nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso.nombre IS 'Nombre del permiso con el que se lo llama en el sistema (se carga en variables de sesión 1 ó 0)';


--
-- Name: COLUMN permiso.descripcion_larga; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso.descripcion_larga IS 'descripción larga del permiso y de la funcionalidad a la que está asociada en el sistema';


--
-- Name: COLUMN permiso.perfil; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso.perfil IS 'Modo en el que se agrupan los permisos en el sistema
0 = General
1 = Asisntentes o Secretarias
2 = Jefes
3 = Bandeja de entrada
4 = Administrador';


--
-- Name: permiso_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permiso_usuario (
    id_permiso integer NOT NULL,
    usua_codi integer NOT NULL
);


--
-- Name: TABLE permiso_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permiso_usuario IS 'Relación entre la tabla de permisos y de usuarios';


--
-- Name: COLUMN permiso_usuario.id_permiso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso_usuario.id_permiso IS 'Id del permiso';


--
-- Name: COLUMN permiso_usuario.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso_usuario.usua_codi IS 'Id del usuario';


--
-- Name: permiso_usuario_dep; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permiso_usuario_dep (
    id_permiso integer NOT NULL,
    usua_codi integer NOT NULL,
    depe_codi integer NOT NULL
);


--
-- Name: TABLE permiso_usuario_dep; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permiso_usuario_dep IS 'Lista de usuarios que tienen el permiso de aprobar solicitudes de respaldo de documentos';


--
-- Name: COLUMN permiso_usuario_dep.id_permiso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso_usuario_dep.id_permiso IS 'Id del permiso';


--
-- Name: COLUMN permiso_usuario_dep.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso_usuario_dep.usua_codi IS 'Id del usuario que tiene el permiso de aprobar las solicitudes de respaldo para los usuarios del área';


--
-- Name: COLUMN permiso_usuario_dep.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.permiso_usuario_dep.depe_codi IS 'Id del área';


--
-- Name: radi_texto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.radi_texto (
    text_codi bigint NOT NULL,
    radi_nume_radi numeric(20,0),
    text_fecha timestamp with time zone,
    text_texto character varying
);


--
-- Name: TABLE radi_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.radi_texto IS 'Texto del documento; se mantienen las diferentes versiones del mismo';


--
-- Name: COLUMN radi_texto.text_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radi_texto.text_codi IS 'Id';


--
-- Name: COLUMN radi_texto.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radi_texto.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN radi_texto.text_fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radi_texto.text_fecha IS 'fecha de creación';


--
-- Name: COLUMN radi_texto.text_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radi_texto.text_texto IS 'Texto del documento';


--
-- Name: radicado_sec_temp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.radicado_sec_temp (
    depe_codi integer NOT NULL,
    secuencia integer
);


--
-- Name: TABLE radicado_sec_temp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.radicado_sec_temp IS 'Se guardan las secuencias para los numeros temporales de los radicados';


--
-- Name: COLUMN radicado_sec_temp.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado_sec_temp.depe_codi IS 'Área a la que pertenece la secuencia';


--
-- Name: COLUMN radicado_sec_temp.secuencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.radicado_sec_temp.secuencia IS 'Valor actual de la secuencia';


--
-- Name: regimen_regimen_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regimen_regimen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: respaldo_estado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respaldo_estado (
    est_codi integer DEFAULT 0 NOT NULL,
    est_nombre character varying(40),
    est_nombre_estado character varying(40),
    est_desc character varying(300),
    est_tipo integer,
    est_estado integer DEFAULT 1
);


--
-- Name: TABLE respaldo_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.respaldo_estado IS 'Tabla de estados utilizada para solicitudes y ejecución de respaldos.';


--
-- Name: COLUMN respaldo_estado.est_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_estado.est_codi IS 'Id primario.';


--
-- Name: COLUMN respaldo_estado.est_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_estado.est_nombre IS 'Nombre del estado para uso interno de programación.';


--
-- Name: COLUMN respaldo_estado.est_nombre_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_estado.est_nombre_estado IS 'Nombre de estado para mostrar al usuario.';


--
-- Name: COLUMN respaldo_estado.est_desc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_estado.est_desc IS 'Descripción del significado de estado.';


--
-- Name: COLUMN respaldo_estado.est_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_estado.est_tipo IS 'Tipo de estado. 1: Estado de la solicitud, 2: Estado de la ejecución del respaldo.';


--
-- Name: COLUMN respaldo_estado.est_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_estado.est_estado IS 'Estado del registro para realizar eliminado lógico. 1: Es True o Activo, 0: False o Inactivo.';


--
-- Name: sec_resp_hist_eventos; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_resp_hist_eventos
    START WITH 1
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


--
-- Name: respaldo_hist_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respaldo_hist_eventos (
    resp_hist_eventos bigint DEFAULT nextval('public.sec_resp_hist_eventos'::regclass) NOT NULL,
    resp_soli_codi bigint,
    usua_codi bigint,
    fecha timestamp with time zone,
    accion integer,
    comentario character varying,
    estado_solicitud integer DEFAULT 0,
    estado_respaldo integer DEFAULT 0
);


--
-- Name: TABLE respaldo_hist_eventos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.respaldo_hist_eventos IS 'Tabla que contiene el historial de todas las acciones realizadas sobre la tabla respaldo.';


--
-- Name: COLUMN respaldo_hist_eventos.resp_hist_eventos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_hist_eventos.resp_hist_eventos IS 'Id primario.';


--
-- Name: COLUMN respaldo_hist_eventos.resp_soli_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_hist_eventos.resp_soli_codi IS 'Id de solicitud de respaldo.';


--
-- Name: COLUMN respaldo_hist_eventos.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_hist_eventos.usua_codi IS 'Id del usuario que realiza la acción.';


--
-- Name: COLUMN respaldo_hist_eventos.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_hist_eventos.fecha IS 'Fecha en que se realiza la acción.';


--
-- Name: COLUMN respaldo_hist_eventos.accion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_hist_eventos.accion IS 'Id de la acción, según el catálogo con las transacciones.';


--
-- Name: COLUMN respaldo_hist_eventos.comentario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_hist_eventos.comentario IS 'Descripción de la acción o comentario ingresado por el usuario.';


--
-- Name: COLUMN respaldo_hist_eventos.estado_solicitud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_hist_eventos.estado_solicitud IS 'Id del estado de la solicitud de respaldo.';


--
-- Name: COLUMN respaldo_hist_eventos.estado_respaldo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_hist_eventos.estado_respaldo IS 'Id del estado de la ejecución de respaldo.';


--
-- Name: sec_respaldo_solicitud; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_respaldo_solicitud
    START WITH 1
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


--
-- Name: respaldo_solicitud; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respaldo_solicitud (
    resp_soli_codi bigint DEFAULT nextval('public.sec_respaldo_solicitud'::regclass) NOT NULL,
    resp_codi bigint,
    usua_codi_solicita bigint,
    usua_codi_autoriza bigint,
    usua_codi_accion bigint,
    fecha_solicita timestamp with time zone,
    fecha_inicio_doc timestamp with time zone,
    fecha_fin_doc timestamp with time zone,
    fecha_inicio_ejec timestamp with time zone,
    fecha_fin_ejec timestamp with time zone,
    estado_solicitud integer DEFAULT 0,
    estado_respaldo integer DEFAULT 0,
    comentario character varying,
    num_documentos integer,
    fecha_ejecutar timestamp with time zone,
    radi_nume_radi numeric(20,0)
);


--
-- Name: TABLE respaldo_solicitud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.respaldo_solicitud IS 'Tabla que contiene las solicitudes de respaldo de documentos.';


--
-- Name: COLUMN respaldo_solicitud.resp_soli_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.resp_soli_codi IS 'Id primario.';


--
-- Name: COLUMN respaldo_solicitud.resp_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.resp_codi IS 'Id de la tabla respaldo usuario.';


--
-- Name: COLUMN respaldo_solicitud.usua_codi_solicita; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.usua_codi_solicita IS 'Id del usuario que solicita el respaldo.';


--
-- Name: COLUMN respaldo_solicitud.usua_codi_autoriza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.usua_codi_autoriza IS 'Id del usuario que autoriza la solicitud de respaldo.';


--
-- Name: COLUMN respaldo_solicitud.usua_codi_accion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.usua_codi_accion IS 'Id del usuario que actualiza la solicitud.';


--
-- Name: COLUMN respaldo_solicitud.fecha_solicita; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.fecha_solicita IS 'Fecha de la solicitud de respaldo.';


--
-- Name: COLUMN respaldo_solicitud.fecha_inicio_doc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.fecha_inicio_doc IS 'Fecha de inicial de documentos a respaldar.';


--
-- Name: COLUMN respaldo_solicitud.fecha_fin_doc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.fecha_fin_doc IS 'Fecha de final de documentos a respaldar.';


--
-- Name: COLUMN respaldo_solicitud.fecha_inicio_ejec; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.fecha_inicio_ejec IS 'Fecha  en que se inicia el proceso de ejecución de respaldos.';


--
-- Name: COLUMN respaldo_solicitud.fecha_fin_ejec; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.fecha_fin_ejec IS 'Fecha  en que se termina el proceso de ejecución de respaldos.';


--
-- Name: COLUMN respaldo_solicitud.estado_solicitud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.estado_solicitud IS 'Id del estado de la solicitud de respaldo.';


--
-- Name: COLUMN respaldo_solicitud.estado_respaldo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.estado_respaldo IS 'Id del estado de la solicitud de la ejecución del respaldo.';


--
-- Name: COLUMN respaldo_solicitud.comentario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.comentario IS 'Campo para ingresar el comentario del usuario.';


--
-- Name: COLUMN respaldo_solicitud.num_documentos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.num_documentos IS 'Cantidad de documentos respaldados.';


--
-- Name: COLUMN respaldo_solicitud.fecha_ejecutar; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.fecha_ejecutar IS 'Fecha en la que se ejecutará el proceso de obtención de respaldos.';


--
-- Name: COLUMN respaldo_solicitud.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_solicitud.radi_nume_radi IS 'Id del documento asociado con el cual se solicita los respaldos.';


--
-- Name: sec_respaldo_usuario; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_respaldo_usuario
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: respaldo_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respaldo_usuario (
    resp_codi bigint DEFAULT nextval('public.sec_respaldo_usuario'::regclass) NOT NULL,
    usua_codi bigint,
    usua_codi_solicita bigint,
    fecha_solicita timestamp with time zone,
    fecha_inicio timestamp with time zone,
    fecha_fin timestamp with time zone,
    num_documentos integer DEFAULT 0,
    fecha_eliminado timestamp with time zone
);


--
-- Name: TABLE respaldo_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.respaldo_usuario IS 'Backups de los documentos generados por los usuarios';


--
-- Name: COLUMN respaldo_usuario.resp_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario.resp_codi IS 'Id del respaldo';


--
-- Name: COLUMN respaldo_usuario.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario.usua_codi IS 'Id del usuario';


--
-- Name: COLUMN respaldo_usuario.usua_codi_solicita; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario.usua_codi_solicita IS 'Id del usuario que solicita el respaldo';


--
-- Name: COLUMN respaldo_usuario.fecha_solicita; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario.fecha_solicita IS 'Fecha en la que se solicitó el respaldo';


--
-- Name: COLUMN respaldo_usuario.fecha_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario.fecha_inicio IS 'Fecha en que inició el proceso de backup';


--
-- Name: COLUMN respaldo_usuario.fecha_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario.fecha_fin IS 'fecha en la que finalizó el proceso de backup';


--
-- Name: COLUMN respaldo_usuario.num_documentos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario.num_documentos IS 'número de documentos a respaldar';


--
-- Name: COLUMN respaldo_usuario.fecha_eliminado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario.fecha_eliminado IS 'Fecha en la que se eliminó el respaldo';


--
-- Name: sec_respaldo_usuario_radicado; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_respaldo_usuario_radicado
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: respaldo_usuario_radicado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.respaldo_usuario_radicado (
    resp_radi_codi bigint DEFAULT nextval('public.sec_respaldo_usuario_radicado'::regclass) NOT NULL,
    resp_codi bigint,
    radi_nume_radi numeric(20,0),
    fila character varying,
    error character varying,
    num_error integer DEFAULT 0,
    tipo integer
);


--
-- Name: TABLE respaldo_usuario_radicado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.respaldo_usuario_radicado IS 'Tabla temporal en la que se guardan los documentos a respaldar';


--
-- Name: COLUMN respaldo_usuario_radicado.resp_radi_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario_radicado.resp_radi_codi IS 'Id';


--
-- Name: COLUMN respaldo_usuario_radicado.resp_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario_radicado.resp_codi IS 'Id del respaldo';


--
-- Name: COLUMN respaldo_usuario_radicado.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario_radicado.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN respaldo_usuario_radicado.fila; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario_radicado.fila IS 'Se guarda el codigo html con los datos del documento para crear los archivos índices';


--
-- Name: COLUMN respaldo_usuario_radicado.error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario_radicado.error IS 'Si hubo algun error al sacar el respaldo se guarda un detalle';


--
-- Name: COLUMN respaldo_usuario_radicado.num_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario_radicado.num_error IS 'Numero de veces que se genero un error en el documento, el sistema intenta respaldar por 3 veces cada documento';


--
-- Name: COLUMN respaldo_usuario_radicado.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.respaldo_usuario_radicado.tipo IS 'Segun la bandeja donde debe estar
1 - Recibidos
2 – Enviados';


--
-- Name: sec_archivo; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_archivo
    START WITH 0
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


--
-- Name: SEQUENCE sec_archivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON SEQUENCE public.sec_archivo IS 'Archivo físico de documentos';


--
-- Name: sec_corregir_usuarios; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_corregir_usuarios
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sec_dependencia; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_dependencia
    START WITH 0
    INCREMENT BY 1
    MINVALUE 0
    MAXVALUE 999999
    CACHE 1;


--
-- Name: sec_institucion; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_institucion
    START WITH 0
    INCREMENT BY 1
    MINVALUE 0
    MAXVALUE 99999
    CACHE 1;


--
-- Name: SEQUENCE sec_institucion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON SEQUENCE public.sec_institucion IS 'Secuencia de Instituciones';


--
-- Name: sec_interconexion_radicado; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_interconexion_radicado
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sec_log_interconexion_radicado; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_log_interconexion_radicado
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sec_metadatos; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_metadatos
    START WITH 1
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


--
-- Name: sec_radi_nume_radi; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_radi_nume_radi
    START WITH 111000000
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 999999999
    CACHE 1;


--
-- Name: sec_radi_texto; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_radi_texto
    START WITH 0
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


--
-- Name: sec_tarea; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_tarea
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sec_tarea_hist_eventos; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_tarea_hist_eventos
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sec_tarea_radi_respuesta; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_tarea_radi_respuesta
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sec_trd; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sec_trd
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: secu_crecimientobodega2011; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.secu_crecimientobodega2011
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: secu_crecimientobodega2012; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.secu_crecimientobodega2012
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: secu_tmpcrecimiento; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.secu_tmpcrecimiento
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sgd_ciu_secue; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sgd_ciu_secue
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


--
-- Name: sgd_dir_secue; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sgd_dir_secue
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 99999999
    CACHE 1;


--
-- Name: sgd_info_secue; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sgd_info_secue
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 9999999999
    CACHE 1;


--
-- Name: sgd_ttr_transaccion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sgd_ttr_transaccion (
    sgd_ttr_codigo smallint NOT NULL,
    sgd_ttr_descrip character varying(100) NOT NULL
);


--
-- Name: TABLE sgd_ttr_transaccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sgd_ttr_transaccion IS 'Catálogo con las transacciones que se pueden realizar con cada documento';


--
-- Name: COLUMN sgd_ttr_transaccion.sgd_ttr_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sgd_ttr_transaccion.sgd_ttr_codigo IS 'Id de la transacción';


--
-- Name: COLUMN sgd_ttr_transaccion.sgd_ttr_descrip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sgd_ttr_transaccion.sgd_ttr_descrip IS 'Detalle de la transacción';


--
-- Name: solicitud_usua_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitud_usua_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tarea; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tarea (
    tarea_codi bigint DEFAULT nextval('public.sec_tarea'::regclass) NOT NULL,
    radi_nume_radi numeric(20,0),
    fecha_inicio timestamp with time zone,
    fecha_fin timestamp with time zone,
    fecha_maxima timestamp with time zone,
    usua_codi_ori bigint,
    usua_codi_dest bigint,
    estado smallint,
    tarea_codi_padre bigint,
    leido smallint,
    avance smallint,
    comentario_fin bigint,
    comentario_inicio bigint
);


--
-- Name: TABLE tarea; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tarea IS 'Registra las tareas asignadas a los usuarios';


--
-- Name: COLUMN tarea.tarea_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.tarea_codi IS 'Id de la tarea';


--
-- Name: COLUMN tarea.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.radi_nume_radi IS 'Id del docuemnto del que depende la tarea';


--
-- Name: COLUMN tarea.fecha_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.fecha_inicio IS 'Fecha en la que se asignó la tarea';


--
-- Name: COLUMN tarea.fecha_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.fecha_fin IS 'Fecha en la que se finalizó o canceló la tarea';


--
-- Name: COLUMN tarea.fecha_maxima; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.fecha_maxima IS 'Fecha máxima asignada para la resolución de la tarea';


--
-- Name: COLUMN tarea.usua_codi_ori; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.usua_codi_ori IS 'Id del usuario que asignó la tarea';


--
-- Name: COLUMN tarea.usua_codi_dest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.usua_codi_dest IS 'Id del usuario al que le asignaron la tarea';


--
-- Name: COLUMN tarea.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.estado IS 'estado de la tarea';


--
-- Name: COLUMN tarea.tarea_codi_padre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.tarea_codi_padre IS 'Id de la tarea padre en caso de que se haya asignado una tarea a partir de otra tarea';


--
-- Name: COLUMN tarea.leido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.leido IS 'Indica si la tarea ya fue leida';


--
-- Name: COLUMN tarea.avance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.avance IS 'Registra el porcentaje de avance de la tarea';


--
-- Name: COLUMN tarea.comentario_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.comentario_fin IS 'Registra el id del último comentario realizado sobre la tarea';


--
-- Name: COLUMN tarea.comentario_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea.comentario_inicio IS 'Registra el id del primer comentario de la tarea';


--
-- Name: tarea_hist_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tarea_hist_eventos (
    tarea_hist_codi bigint DEFAULT nextval('public.sec_tarea_hist_eventos'::regclass) NOT NULL,
    tarea_codi bigint,
    radi_nume_radi numeric(20,0),
    usua_codi_ori bigint,
    fecha timestamp with time zone,
    accion integer,
    comentario character varying,
    referencia character varying
);


--
-- Name: TABLE tarea_hist_eventos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tarea_hist_eventos IS 'Recorrido de las tareas';


--
-- Name: COLUMN tarea_hist_eventos.tarea_hist_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_hist_eventos.tarea_hist_codi IS 'Id';


--
-- Name: COLUMN tarea_hist_eventos.tarea_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_hist_eventos.tarea_codi IS 'Id de la tarea';


--
-- Name: COLUMN tarea_hist_eventos.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_hist_eventos.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN tarea_hist_eventos.usua_codi_ori; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_hist_eventos.usua_codi_ori IS 'Id del usuario que realizó la acción';


--
-- Name: COLUMN tarea_hist_eventos.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_hist_eventos.fecha IS 'Fecha de la acción';


--
-- Name: COLUMN tarea_hist_eventos.accion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_hist_eventos.accion IS 'Id de la transacción realizada';


--
-- Name: COLUMN tarea_hist_eventos.comentario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_hist_eventos.comentario IS 'Comentario realizado por el usuario';


--
-- Name: COLUMN tarea_hist_eventos.referencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_hist_eventos.referencia IS 'Campo adicional para guardar códigos o fechas o datos adicionales dependiendo de la transacción';


--
-- Name: tarea_radi_respuesta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tarea_radi_respuesta (
    tarea_codi bigint,
    radi_nume_radi numeric(20,0),
    radi_nume_resp numeric(20,0),
    tarea_resp_codi bigint DEFAULT nextval('public.sec_tarea_hist_eventos'::regclass) NOT NULL
);


--
-- Name: TABLE tarea_radi_respuesta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tarea_radi_respuesta IS 'Asociación de documentos cuando se responde a un documento a partir de una tarea';


--
-- Name: COLUMN tarea_radi_respuesta.tarea_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_radi_respuesta.tarea_codi IS 'Id de la tarea';


--
-- Name: COLUMN tarea_radi_respuesta.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_radi_respuesta.radi_nume_radi IS 'Id del documento padre';


--
-- Name: COLUMN tarea_radi_respuesta.radi_nume_resp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_radi_respuesta.radi_nume_resp IS 'Id del documento respuesta';


--
-- Name: COLUMN tarea_radi_respuesta.tarea_resp_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarea_radi_respuesta.tarea_resp_codi IS 'Id';


--
-- Name: tipo_cargo_id_tipo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_cargo_id_tipo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_certificado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_certificado (
    tipo_cert_codi smallint NOT NULL,
    descripcion character varying(150),
    estado smallint DEFAULT 1
);


--
-- Name: TABLE tipo_certificado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tipo_certificado IS 'Almacena los tipos de certificados permitidos (depende de la CA, el dispositivo, el formato, etc.)';


--
-- Name: COLUMN tipo_certificado.tipo_cert_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipo_certificado.tipo_cert_codi IS 'Id';


--
-- Name: COLUMN tipo_certificado.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipo_certificado.descripcion IS 'Descripción del tipo de certificado';


--
-- Name: COLUMN tipo_certificado.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipo_certificado.estado IS 'Estado:
1 - Activo
0 - Inactivo';


--
-- Name: tiporad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiporad (
    trad_codigo numeric(1,0) NOT NULL,
    trad_descr character varying(100),
    trad_tipo character varying(1),
    trad_inst_codi integer DEFAULT 0,
    trad_estado smallint DEFAULT 1,
    trad_abreviatura character varying(5),
    trad_opc_impresion character varying,
    trad_texto_inicio character varying,
    trad_formato character varying,
    trad_formato_tipo smallint DEFAULT 1
);


--
-- Name: TABLE tiporad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tiporad IS 'Tipo de documento';


--
-- Name: COLUMN tiporad.trad_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_codigo IS 'Id del tipo de documento';


--
-- Name: COLUMN tiporad.trad_descr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_descr IS 'Nombre del documento (oficio, memo, etc.)';


--
-- Name: COLUMN tiporad.trad_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_tipo IS 'Si es documento de entrada o de salida';


--
-- Name: COLUMN tiporad.trad_inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_inst_codi IS 'Institución a la que pertenece el documento; "0" para todas las instituciones';


--
-- Name: COLUMN tiporad.trad_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_estado IS 'Estado, activo o inactivo';


--
-- Name: COLUMN tiporad.trad_abreviatura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_abreviatura IS 'Abreviatura por defecto para el tipo de documento';


--
-- Name: COLUMN tiporad.trad_opc_impresion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_opc_impresion IS 'Opciones de impresión que se habilitan para cada documento';


--
-- Name: COLUMN tiporad.trad_texto_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_texto_inicio IS 'Texto que se carga por defecto al crear un nuevo documento de este tipo';


--
-- Name: COLUMN tiporad.trad_formato; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_formato IS 'formato del documento, se lo escribe en base a patrones que luego van a ser reemplazados con los datos del documento';


--
-- Name: COLUMN tiporad.trad_formato_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tiporad.trad_formato_tipo IS 'Carga ciertas opciones especiales para algunos documentos';


--
-- Name: titulo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.titulo (
    tit_codi integer NOT NULL,
    tit_nombre character varying(100) NOT NULL,
    tit_abreviatura character varying(50)
);


--
-- Name: TABLE titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.titulo IS 'Lista de títulos académicos admitidos en el sistema';


--
-- Name: COLUMN titulo.tit_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.titulo.tit_codi IS 'Id';


--
-- Name: COLUMN titulo.tit_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.titulo.tit_nombre IS 'Tratamiento o título académico';


--
-- Name: COLUMN titulo.tit_abreviatura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.titulo.tit_abreviatura IS 'Abreviatura del título';


--
-- Name: titulo_tit_codi_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.titulo_tit_codi_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: titulo_tit_codi_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.titulo_tit_codi_seq1 OWNED BY public.titulo.tit_codi;


--
-- Name: trd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trd (
    trd_codi bigint NOT NULL,
    trd_padre bigint NOT NULL,
    trd_nombre character varying(100),
    depe_codi integer,
    trd_estado smallint DEFAULT 0,
    trd_arch_gestion integer DEFAULT 5,
    trd_arch_central integer DEFAULT 15,
    trd_fecha_desde date,
    trd_fecha_hasta date,
    trd_ocupado smallint DEFAULT 0,
    trd_nivel smallint DEFAULT 0
);


--
-- Name: TABLE trd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trd IS 'Tabla recursiva, estructura de las carpetas virtuales';


--
-- Name: COLUMN trd.trd_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_codi IS 'Id de la carpeta virtual';


--
-- Name: COLUMN trd.trd_padre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_padre IS 'Id de la carpeta padre';


--
-- Name: COLUMN trd.trd_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_nombre IS 'Nombre de la carpeta';


--
-- Name: COLUMN trd.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.depe_codi IS 'Área a la que pertenece la carpeta';


--
-- Name: COLUMN trd.trd_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_estado IS 'Indica si la carpeta está activa';


--
-- Name: COLUMN trd.trd_arch_gestion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_arch_gestion IS 'Tiempo que debe mantenerse el documento en el archivo de gestion';


--
-- Name: COLUMN trd.trd_arch_central; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_arch_central IS 'Tiempo que se deberá mantener el documento en el archivo central';


--
-- Name: COLUMN trd.trd_fecha_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_fecha_desde IS 'Fecha desde la que se activó la carpeta';


--
-- Name: COLUMN trd.trd_fecha_hasta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_fecha_hasta IS 'Fecha en la que se cerró la carpeta';


--
-- Name: COLUMN trd.trd_ocupado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_ocupado IS 'Indica si el expediente ya se encuentra relacionado con un expediente fisico';


--
-- Name: COLUMN trd.trd_nivel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd.trd_nivel IS 'Indica el nivel en el que se encuentra la carpeta virtual';


--
-- Name: trd_nivel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trd_nivel (
    trd_codi integer NOT NULL,
    depe_codi integer NOT NULL,
    trd_nombre character varying(50) NOT NULL,
    trd_descripcion character varying(100)
);


--
-- Name: TABLE trd_nivel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trd_nivel IS 'Descripción de los niveles que tendrá la estructura de carpetas virtuales';


--
-- Name: COLUMN trd_nivel.trd_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_nivel.trd_codi IS 'Id del Item, es un secuencial dependiendo del area funcional';


--
-- Name: COLUMN trd_nivel.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_nivel.depe_codi IS 'Area funcional a la que pertenece el archivo';


--
-- Name: COLUMN trd_nivel.trd_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_nivel.trd_nombre IS 'Nombre del Item';


--
-- Name: COLUMN trd_nivel.trd_descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_nivel.trd_descripcion IS 'Descripcion del Item';


--
-- Name: trd_radicado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trd_radicado (
    radi_nume_radi numeric(20,0) NOT NULL,
    trd_codi bigint NOT NULL,
    usua_codi integer,
    fecha timestamp with time zone,
    depe_codi integer
);


--
-- Name: TABLE trd_radicado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trd_radicado IS 'Relación entre las carpetas virtuales y los documentos que se asocian a ellas';


--
-- Name: COLUMN trd_radicado.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_radicado.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN trd_radicado.trd_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_radicado.trd_codi IS 'Id de la carpeta';


--
-- Name: COLUMN trd_radicado.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_radicado.usua_codi IS 'Id del usuario que asoció el documento';


--
-- Name: COLUMN trd_radicado.fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_radicado.fecha IS 'Fecha en la que se asoció el documento';


--
-- Name: COLUMN trd_radicado.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trd_radicado.depe_codi IS 'Área a la que pertenece la carpeta';


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    usua_codi integer NOT NULL,
    usua_cedula character varying(50),
    usua_nomb character varying(200),
    usua_apellido character varying(200),
    usua_nombre text,
    cargo_tipo integer,
    usua_cargo character varying,
    usua_nuevo smallint,
    usua_login character varying(50),
    usua_pasw character varying(35),
    usua_esta integer,
    usua_email character varying(500),
    usua_titulo character varying(100),
    usua_abr_titulo character varying(30),
    tipo_usuario integer,
    usua_tipo_certificado integer,
    usua_subrogado integer,
    visible_sub integer,
    usua_cargo_cabecera character varying,
    usua_direccion character varying,
    usua_telefono character varying,
    usua_firma_path character varying,
    depe_codi integer,
    depe_nomb character varying,
    dep_sigla character varying,
    inst_codi integer,
    inst_nombre character varying,
    inst_sigla character varying,
    inst_estado integer,
    ciu_codi integer,
    usua_ciudad character varying(100),
    tipo_identificacion integer DEFAULT 0,
    usua_datos character varying,
    inst_adscrita integer,
    inst_padre_nombre character varying(200),
    inst_padre_sigla character varying(10)
);


--
-- Name: TABLE usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario IS 'Vista materializada que contiene la unión de las tablas USUARIOS, CIUDADANO, INSTITUCION, DEPENDENCIA y CIUDAD.
Es actualizada por disparadores sobre las 5 tablas
Guarda cualquier error ocurrido en la tabla LOG_VIEW_USUARIO';


--
-- Name: COLUMN usuario.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_codi IS 'Id del usuario o ciudadano';


--
-- Name: COLUMN usuario.usua_cedula; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_cedula IS 'No. de cédula';


--
-- Name: COLUMN usuario.usua_nomb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_nomb IS 'Nombre del usuario';


--
-- Name: COLUMN usuario.usua_apellido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_apellido IS 'Apellido del usuario';


--
-- Name: COLUMN usuario.usua_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_nombre IS 'Nombres y apellidos del usuario concatenados';


--
-- Name: COLUMN usuario.cargo_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.cargo_tipo IS 'Tipo de cargo: 
- 0 normal  
- 1 jefe
- 2  asistente';


--
-- Name: COLUMN usuario.usua_nuevo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_nuevo IS 'Determina si el usuario ya cambió su clave del sistema o si se debe enviar el email para cambio de clave';


--
-- Name: COLUMN usuario.usua_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_login IS 'Login del usuario (deben comenzar con "U"); existen usuarios especiales que comienzan con ''UUSR'' y ''UADM''';


--
-- Name: COLUMN usuario.usua_pasw; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_pasw IS 'Contraseña del usuario en md5';


--
-- Name: COLUMN usuario.usua_esta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_esta IS 'Estado del usuario, activo o inactivo';


--
-- Name: COLUMN usuario.usua_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_email IS 'Email, pueden ser varios separados por comas';


--
-- Name: COLUMN usuario.usua_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_titulo IS 'Tratamiento o título académico';


--
-- Name: COLUMN usuario.usua_abr_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_abr_titulo IS 'Abreviacion del titulo';


--
-- Name: COLUMN usuario.tipo_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.tipo_usuario IS 'Tipo de usuario:
- 1 si es funcionario
- 2 si es ciudadano';


--
-- Name: COLUMN usuario.usua_tipo_certificado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_tipo_certificado IS 'Id del tipo de certificado digital que posee';


--
-- Name: COLUMN usuario.usua_subrogado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_subrogado IS 'Id del usuario subrogado';


--
-- Name: COLUMN usuario.visible_sub; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.visible_sub IS 'Indica si el usuario ha sido subrogado';


--
-- Name: COLUMN usuario.usua_cargo_cabecera; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_cargo_cabecera IS 'Cargo que se muestra cuando se selecciona al usuario como destinatario';


--
-- Name: COLUMN usuario.usua_direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_direccion IS 'Dirección domiciliaria';


--
-- Name: COLUMN usuario.usua_telefono; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_telefono IS 'Número telefónico';


--
-- Name: COLUMN usuario.usua_firma_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_firma_path IS 'Path en el que se encuentra la imágen escaneada de la firma';


--
-- Name: COLUMN usuario.depe_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.depe_codi IS 'Id del área a la que pertenece el usuario';


--
-- Name: COLUMN usuario.depe_nomb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.depe_nomb IS 'Nombre del área a la que pertenece el usuario';


--
-- Name: COLUMN usuario.dep_sigla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.dep_sigla IS 'Sigla del área a la que pertenece el usuario';


--
-- Name: COLUMN usuario.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.inst_codi IS 'Id de la institución a la que pertenece el usuario';


--
-- Name: COLUMN usuario.inst_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.inst_nombre IS 'Nombre de la institución a la que pertenece el usuario';


--
-- Name: COLUMN usuario.inst_sigla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.inst_sigla IS 'Siglas de la institución a la que pertenece el usuario';


--
-- Name: COLUMN usuario.inst_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.inst_estado IS 'Estado de la institución a la que pertenece el usuario';


--
-- Name: COLUMN usuario.ciu_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.ciu_codi IS 'Id de la diudad del usuario';


--
-- Name: COLUMN usuario.usua_ciudad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_ciudad IS 'Nombre de la diudad del usuario';


--
-- Name: COLUMN usuario.tipo_identificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.tipo_identificacion IS '0 cedula  1 pasaporte';


--
-- Name: COLUMN usuario.usua_datos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.usua_datos IS 'Datos concatenados del usuario sin tildes ni eñes y en mayúsculas (cédula, nombres, apellidos, título, cargo, email, área, institución, siglas)';


--
-- Name: COLUMN usuario.inst_adscrita; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.inst_adscrita IS 'Id de la institución adscrita';


--
-- Name: COLUMN usuario.inst_padre_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.inst_padre_nombre IS 'Nombre de la institución adscrita';


--
-- Name: COLUMN usuario.inst_padre_sigla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.inst_padre_sigla IS 'Siglas de la institución adscrita';


--
-- Name: usuario_dependencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_dependencia (
    usua_codi_actualiza integer,
    usua_codi integer NOT NULL,
    depe_codi_padre integer,
    inst_codi integer,
    depe_codi_tmp character varying,
    usua_codi_depe integer NOT NULL
);


--
-- Name: TABLE usuario_dependencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario_dependencia IS 'Administración de usuarios por áreas';


--
-- Name: COLUMN usuario_dependencia.usua_codi_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_dependencia.usua_codi_actualiza IS 'codigo de usuario que realiza la actualizacion';


--
-- Name: COLUMN usuario_dependencia.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_dependencia.usua_codi IS 'codigo de usuario';


--
-- Name: COLUMN usuario_dependencia.depe_codi_padre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_dependencia.depe_codi_padre IS 'dependencia padre de la institucion';


--
-- Name: COLUMN usuario_dependencia.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_dependencia.inst_codi IS 'institucion que pertenece el usuario';


--
-- Name: COLUMN usuario_dependencia.depe_codi_tmp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_dependencia.depe_codi_tmp IS 'dependencias que administra el usuario';


--
-- Name: COLUMN usuario_dependencia.usua_codi_depe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_dependencia.usua_codi_depe IS 'clave primaria de la tabla';


--
-- Name: usuario_dependencia_usua_codi_depe_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_dependencia_usua_codi_depe_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_dependencia_usua_codi_depe_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_dependencia_usua_codi_depe_seq OWNED BY public.usuario_dependencia.usua_codi_depe;


--
-- Name: usuario_nombre; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.usuario_nombre AS
 SELECT u.usua_codi,
    (((COALESCE(u.usua_nomb, ''::character varying))::text || ' '::text) || (COALESCE(u.usua_apellido, ''::character varying))::text) AS usua_nombre
   FROM public.usuarios u
UNION
 SELECT c.ciu_codigo AS usua_codi,
    (((COALESCE(c.ciu_nombre, ''::character varying))::text || ' '::text) || (COALESCE(c.ciu_apellido, ''::character varying))::text) AS usua_nombre
   FROM public.ciudadano c;


--
-- Name: usuario_notificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_notificacion (
    id_mail numeric NOT NULL,
    usua_destinatario numeric NOT NULL,
    usua_nombre character varying,
    email character varying
);


--
-- Name: TABLE usuario_notificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuario_notificacion IS 'Usuarios a los que se envió notificaciones por email';


--
-- Name: COLUMN usuario_notificacion.id_mail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_notificacion.id_mail IS 'Id del email';


--
-- Name: COLUMN usuario_notificacion.usua_destinatario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_notificacion.usua_destinatario IS 'Id del usuario destinatario';


--
-- Name: COLUMN usuario_notificacion.usua_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_notificacion.usua_nombre IS 'Nombre del usuario';


--
-- Name: COLUMN usuario_notificacion.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario_notificacion.email IS 'Email del usuario';


--
-- Name: usuarios_radicado_usua_radi_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_radicado_usua_radi_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_radicado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios_radicado (
    radi_nume_radi numeric(20,0),
    usua_cedula character varying(50),
    usua_nombre character varying(200),
    usua_apellido character varying(200),
    usua_titulo character varying(100),
    usua_cargo character varying(200),
    usua_institucion character varying(200),
    radi_usua_tipo smallint,
    usua_abr_titulo character varying(30),
    usua_email character varying(500),
    usua_radi_codi bigint DEFAULT nextval('public.usuarios_radicado_usua_radi_codi_seq'::regclass) NOT NULL,
    usua_ciudad character(100),
    usua_area character varying(150),
    usua_area_codi numeric(20,0),
    lista_nombre character varying,
    usua_firma_path character varying,
    usua_codi bigint,
    inst_codi integer
);


--
-- Name: TABLE usuarios_radicado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios_radicado IS 'Se guardan los datos de los usuarios (de, para y cca) tal y como estaban en la BDD al momento de firmar el documento';


--
-- Name: COLUMN usuarios_radicado.radi_nume_radi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.radi_nume_radi IS 'Id del documento';


--
-- Name: COLUMN usuarios_radicado.usua_cedula; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_cedula IS 'Número de cédula';


--
-- Name: COLUMN usuarios_radicado.usua_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_nombre IS 'Nombre del usuario';


--
-- Name: COLUMN usuarios_radicado.usua_apellido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_apellido IS 'Apellido del usuario';


--
-- Name: COLUMN usuarios_radicado.usua_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_titulo IS 'Tratamiento o título académico';


--
-- Name: COLUMN usuarios_radicado.usua_cargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_cargo IS 'Cargo del usuario';


--
-- Name: COLUMN usuarios_radicado.usua_institucion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_institucion IS 'Nombre de la institución';


--
-- Name: COLUMN usuarios_radicado.radi_usua_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.radi_usua_tipo IS 'Tipo de usuario: 
1 - Remitente 
2 - Destinatario 
3 - Con copia a';


--
-- Name: COLUMN usuarios_radicado.usua_abr_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_abr_titulo IS 'Abreviación del título';


--
-- Name: COLUMN usuarios_radicado.usua_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_email IS 'Dirección del correo electrónico';


--
-- Name: COLUMN usuarios_radicado.usua_radi_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_radi_codi IS 'Id';


--
-- Name: COLUMN usuarios_radicado.usua_ciudad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_ciudad IS 'Nombre de la ciudad en la que se encuentra el usuario';


--
-- Name: COLUMN usuarios_radicado.usua_area; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_area IS 'nombre del área a la que pertenece';


--
-- Name: COLUMN usuarios_radicado.usua_area_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_area_codi IS 'Id del área';


--
-- Name: COLUMN usuarios_radicado.lista_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.lista_nombre IS 'Nombre de la lista (Si el documento fue enviado a una lista, caso contrario campo vacío)';


--
-- Name: COLUMN usuarios_radicado.usua_firma_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_firma_path IS 'Path del archivo en caso que tenga escaneada una firma';


--
-- Name: COLUMN usuarios_radicado.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.usua_codi IS 'Id del usuario';


--
-- Name: COLUMN usuarios_radicado.inst_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_radicado.inst_codi IS 'Id de la institución';


--
-- Name: usuarios_sesion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios_sesion (
    usua_codi integer NOT NULL,
    usua_sesion character varying(200),
    usua_fech_sesion timestamp with time zone,
    usua_intentos integer DEFAULT 0,
    ip_cliente character varying(300)
);


--
-- Name: TABLE usuarios_sesion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios_sesion IS 'Se almacenan los datos de la conexión cuando un usuario ingresa al sistema';


--
-- Name: COLUMN usuarios_sesion.usua_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_sesion.usua_codi IS 'Id del usuario';


--
-- Name: COLUMN usuarios_sesion.usua_sesion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_sesion.usua_sesion IS 'Id de la session';


--
-- Name: COLUMN usuarios_sesion.usua_fech_sesion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_sesion.usua_fech_sesion IS 'Fecha de inicio de la sesion';


--
-- Name: COLUMN usuarios_sesion.usua_intentos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_sesion.usua_intentos IS 'número de veces que el usuario intentó loguearse en el sistema (luego de 5 intentos fallidos se bloquea el usuario por 5 minutos)';


--
-- Name: COLUMN usuarios_sesion.ip_cliente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_sesion.ip_cliente IS 'Ip de la máquina del usuario que accede al sistema';


--
-- Name: usuarios_subrogacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios_subrogacion (
    usua_subrogado integer,
    usua_subrogante integer,
    usua_fecha_inicio timestamp with time zone,
    usua_fecha_fin timestamp with time zone,
    usua_visible integer,
    usua_observacion character varying,
    usua_subrogacion_codi integer NOT NULL,
    usua_fecha_actualizacion timestamp with time zone,
    usua_codi_actualiza integer
);


--
-- Name: TABLE usuarios_subrogacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios_subrogacion IS 'Controla la subrogación de usuarios, cuando por algun motivo el titular del cargo debe ausentarse temporalmente y otro lo remplaza en sus funciones';


--
-- Name: COLUMN usuarios_subrogacion.usua_subrogado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_subrogado IS 'Id del usuario que va a ser reemplazado temporalmente por subrogante';


--
-- Name: COLUMN usuarios_subrogacion.usua_subrogante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_subrogante IS 'Id del usuario que reemplaza al subrogado';


--
-- Name: COLUMN usuarios_subrogacion.usua_fecha_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_fecha_inicio IS 'Fecha que inicia la subrogacion';


--
-- Name: COLUMN usuarios_subrogacion.usua_fecha_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_fecha_fin IS 'Fecha que finaliza la subrogacion';


--
-- Name: COLUMN usuarios_subrogacion.usua_visible; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_visible IS 'Estado de subrogacion, activa o terminada';


--
-- Name: COLUMN usuarios_subrogacion.usua_observacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_observacion IS 'observaciones';


--
-- Name: COLUMN usuarios_subrogacion.usua_subrogacion_codi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_subrogacion_codi IS 'Id';


--
-- Name: COLUMN usuarios_subrogacion.usua_fecha_actualizacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_fecha_actualizacion IS 'Fecha que se registra';


--
-- Name: COLUMN usuarios_subrogacion.usua_codi_actualiza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios_subrogacion.usua_codi_actualiza IS 'Id del usuario quien hace la subrogacion';


--
-- Name: usuarios_subrogacion_usua_subrogacion_codi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_subrogacion_usua_subrogacion_codi_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_subrogacion_usua_subrogacion_codi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_subrogacion_usua_subrogacion_codi_seq OWNED BY public.usuarios_subrogacion.usua_subrogacion_codi;


--
-- Name: bandeja_compartida ban_com_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bandeja_compartida ALTER COLUMN ban_com_codi SET DEFAULT nextval('public.bandeja_compartida_ban_com_codi_seq1'::regclass);


--
-- Name: categoria cat_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria ALTER COLUMN cat_codi SET DEFAULT nextval('public.categoria_cat_codi_seq1'::regclass);


--
-- Name: codificacion cod_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codificacion ALTER COLUMN cod_codi SET DEFAULT nextval('public.codificacion_cod_codi_seq1'::regclass);


--
-- Name: hist_envio_fisico his_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hist_envio_fisico ALTER COLUMN his_id SET DEFAULT nextval('public.hist_envio_fisico_his_id_seq1'::regclass);


--
-- Name: hist_opc_impresion hist_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hist_opc_impresion ALTER COLUMN hist_codi SET DEFAULT nextval('public.hist_opc_impresion_hist_codi_seq'::regclass);


--
-- Name: log_archivo_descarga log_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_archivo_descarga ALTER COLUMN log_codi SET DEFAULT nextval('public.log_archivo_descarga_log_codi_seq'::regclass);


--
-- Name: log_matar_procesos_servidores log_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_matar_procesos_servidores ALTER COLUMN log_codi SET DEFAULT nextval('public.log_matar_procesos_servidores_log_codi_seq'::regclass);


--
-- Name: log_view_usuario log_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_view_usuario ALTER COLUMN log_codi SET DEFAULT nextval('public.log_view_usuario_log_codi_seq'::regclass);


--
-- Name: opciones_impresion opc_imp_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones_impresion ALTER COLUMN opc_imp_codi SET DEFAULT nextval('public.opciones_impresion_opc_imp_codi_seq'::regclass);


--
-- Name: opciones_impresion_sobre opc_imp_sob_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones_impresion_sobre ALTER COLUMN opc_imp_sob_codi SET DEFAULT nextval('public.opciones_impresion_sobre_opc_imp_sob_codi_seq'::regclass);


--
-- Name: titulo tit_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulo ALTER COLUMN tit_codi SET DEFAULT nextval('public.titulo_tit_codi_seq1'::regclass);


--
-- Name: usuario_dependencia usua_codi_depe; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_dependencia ALTER COLUMN usua_codi_depe SET DEFAULT nextval('public.usuario_dependencia_usua_codi_depe_seq'::regclass);


--
-- Name: usuarios_subrogacion usua_subrogacion_codi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_subrogacion ALTER COLUMN usua_subrogacion_codi SET DEFAULT nextval('public.usuarios_subrogacion_usua_subrogacion_codi_seq'::regclass);


--
-- Name: sgd_ttr_transaccion PK_SGD_TTR_TRANSACCION; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgd_ttr_transaccion
    ADD CONSTRAINT "PK_SGD_TTR_TRANSACCION" PRIMARY KEY (sgd_ttr_codigo);


--
-- Name: hist_opc_impresion hist_opc_impresion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hist_opc_impresion
    ADD CONSTRAINT hist_opc_impresion_pkey PRIMARY KEY (hist_codi);


--
-- Name: institucion_org institucion_org_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institucion_org
    ADD CONSTRAINT institucion_org_pkey PRIMARY KEY (org_id, inst_codi);


--
-- Name: log_usr_permisos log_user_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_usr_permisos
    ADD CONSTRAINT log_user_permisos_pkey PRIMARY KEY (id_transaccion);


--
-- Name: log_usr_ciudadanos log_usr_ciudadanos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_usr_ciudadanos
    ADD CONSTRAINT log_usr_ciudadanos_pkey PRIMARY KEY (logc_codi);


--
-- Name: accion pkAccion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accion
    ADD CONSTRAINT "pkAccion" PRIMARY KEY (accion_codi);


--
-- Name: actualizar_sistema pk_actualizar_sistema; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actualizar_sistema
    ADD CONSTRAINT pk_actualizar_sistema PRIMARY KEY (actu_codi);


--
-- Name: anexos pk_anex_codigo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anexos
    ADD CONSTRAINT pk_anex_codigo PRIMARY KEY (anex_codigo);


--
-- Name: anexos_tipo pk_anex_tipo_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anexos_tipo
    ADD CONSTRAINT pk_anex_tipo_codi PRIMARY KEY (anex_tipo_codi);


--
-- Name: archivo pk_archivo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo
    ADD CONSTRAINT pk_archivo PRIMARY KEY (arch_codi);


--
-- Name: archivo_nivel pk_archivo_nivel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_nivel
    ADD CONSTRAINT pk_archivo_nivel PRIMARY KEY (arch_codi, depe_codi);


--
-- Name: archivo_radicado pk_archivo_radicado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_radicado
    ADD CONSTRAINT pk_archivo_radicado PRIMARY KEY (radi_nume_radi, arch_codi, anex_numero);


--
-- Name: bandeja_compartida pk_bandeja_compartida; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bandeja_compartida
    ADD CONSTRAINT pk_bandeja_compartida PRIMARY KEY (ban_com_codi);


--
-- Name: bloqueo_sistema pk_bloqueo_sistema; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bloqueo_sistema
    ADD CONSTRAINT pk_bloqueo_sistema PRIMARY KEY (bloq_codi);


--
-- Name: carpeta pk_carp_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carpeta
    ADD CONSTRAINT pk_carp_codi PRIMARY KEY (carp_codi);


--
-- Name: categoria pk_categoria_cat_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT pk_categoria_cat_codi PRIMARY KEY (cat_codi);


--
-- Name: ciudadano pk_ciu_codigo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT pk_ciu_codigo PRIMARY KEY (ciu_codigo);


--
-- Name: solicitud_firma_ciudadano pk_ciu_codigo_solicitud; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_firma_ciudadano
    ADD CONSTRAINT pk_ciu_codigo_solicitud PRIMARY KEY (sol_codigo);


--
-- Name: ciudad pk_ciudad; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudad
    ADD CONSTRAINT pk_ciudad PRIMARY KEY (id);


--
-- Name: ciudadano_tmp pk_ciudadano_tmp; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudadano_tmp
    ADD CONSTRAINT pk_ciudadano_tmp PRIMARY KEY (ciu_codigo);


--
-- Name: codificacion pk_codificacion_cod_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codificacion
    ADD CONSTRAINT pk_codificacion_cod_codi PRIMARY KEY (cod_codi);


--
-- Name: contenido pk_contenido; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenido
    ADD CONSTRAINT pk_contenido PRIMARY KEY (cont_codi);


--
-- Name: contenido_tipo pk_contenido_tipo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenido_tipo
    ADD CONSTRAINT pk_contenido_tipo PRIMARY KEY (cont_tipo_codi);


--
-- Name: dependencia pk_dependencia; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencia
    ADD CONSTRAINT pk_dependencia PRIMARY KEY (depe_codi);


--
-- Name: institucion_coordinador pk_dependencia_coordinador; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institucion_coordinador
    ADD CONSTRAINT pk_dependencia_coordinador PRIMARY KEY (inst_coor_codi);


--
-- Name: estado pk_esta_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado
    ADD CONSTRAINT pk_esta_codi PRIMARY KEY (esta_codi);


--
-- Name: trd_nivel pk_expediente_nivel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd_nivel
    ADD CONSTRAINT pk_expediente_nivel PRIMARY KEY (trd_codi, depe_codi);


--
-- Name: formato_numeracion pk_formato_numeracion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formato_numeracion
    ADD CONSTRAINT pk_formato_numeracion PRIMARY KEY (depe_codi, fn_tiporad);


--
-- Name: hist_envio_fisico pk_hist_event_fisico_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hist_envio_fisico
    ADD CONSTRAINT pk_hist_event_fisico_id PRIMARY KEY (his_id);


--
-- Name: hist_eventos pk_hist_eventos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hist_eventos
    ADD CONSTRAINT pk_hist_eventos PRIMARY KEY (hist_codi);


--
-- Name: permiso pk_id_permiso; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso
    ADD CONSTRAINT pk_id_permiso PRIMARY KEY (id_permiso);


--
-- Name: informados pk_informados; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informados
    ADD CONSTRAINT pk_informados PRIMARY KEY (info_codi);


--
-- Name: institucion pk_institucion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institucion
    ADD CONSTRAINT pk_institucion PRIMARY KEY (inst_codi);


--
-- Name: lista pk_lista_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista
    ADD CONSTRAINT pk_lista_id PRIMARY KEY (lista_codi);


--
-- Name: lista_usuarios pk_lista_usuarios; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_usuarios
    ADD CONSTRAINT pk_lista_usuarios PRIMARY KEY (lista_codi, usua_codi);


--
-- Name: log pk_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT pk_log PRIMARY KEY (log_id);


--
-- Name: log_acceso pk_log_acceso; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_acceso
    ADD CONSTRAINT pk_log_acceso PRIMARY KEY (log_codi);


--
-- Name: log_archivo_descarga pk_log_archivo_descarga; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_archivo_descarga
    ADD CONSTRAINT pk_log_archivo_descarga PRIMARY KEY (log_codi);


--
-- Name: log_bloqueos_dos pk_log_bloqueos_dos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_bloqueos_dos
    ADD CONSTRAINT pk_log_bloqueos_dos PRIMARY KEY (log_codi);


--
-- Name: log_full_backup pk_log_full_backup1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_full_backup
    ADD CONSTRAINT pk_log_full_backup1 PRIMARY KEY (log_codi);


--
-- Name: log_matar_procesos_servidores pk_log_matar_procesos_servidores; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_matar_procesos_servidores
    ADD CONSTRAINT pk_log_matar_procesos_servidores PRIMARY KEY (log_codi);


--
-- Name: log_paginas_visitadas pk_log_paginas_visitadas; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_paginas_visitadas
    ADD CONSTRAINT pk_log_paginas_visitadas PRIMARY KEY (log_codi);


--
-- Name: log_sesion pk_log_sesion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_sesion
    ADD CONSTRAINT pk_log_sesion PRIMARY KEY (fecha);


--
-- Name: log_tiempo_ws_firma pk_log_tiempo_ws_firma; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_tiempo_ws_firma
    ADD CONSTRAINT pk_log_tiempo_ws_firma PRIMARY KEY (radi_nume_radi);


--
-- Name: log_view_usuario pk_log_view_usuario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_view_usuario
    ADD CONSTRAINT pk_log_view_usuario PRIMARY KEY (log_codi);


--
-- Name: mail_notificacion pk_mail; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mail_notificacion
    ADD CONSTRAINT pk_mail PRIMARY KEY (mail_codi);


--
-- Name: metadatos pk_met; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metadatos
    ADD CONSTRAINT pk_met PRIMARY KEY (met_codi);


--
-- Name: metadatos_radicado pk_met_radicado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metadatos_radicado
    ADD CONSTRAINT pk_met_radicado PRIMARY KEY (met_radi_codi);


--
-- Name: opciones_impresion_sobre pk_opc_imp_sob_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones_impresion_sobre
    ADD CONSTRAINT pk_opc_imp_sob_codi PRIMARY KEY (opc_imp_sob_codi);


--
-- Name: opciones_impresion pk_opciones_impresion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opciones_impresion
    ADD CONSTRAINT pk_opciones_impresion PRIMARY KEY (opc_imp_codi);


--
-- Name: permiso_usuario pk_permiso_cargo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_usuario
    ADD CONSTRAINT pk_permiso_cargo PRIMARY KEY (id_permiso, usua_codi);


--
-- Name: permiso_usuario_dep pk_permiso_usuario_dep; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_usuario_dep
    ADD CONSTRAINT pk_permiso_usuario_dep PRIMARY KEY (id_permiso, depe_codi);


--
-- Name: radicado pk_radi_final; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT pk_radi_final PRIMARY KEY (radi_nume_radi);


--
-- Name: radi_texto pk_radi_text; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radi_texto
    ADD CONSTRAINT pk_radi_text PRIMARY KEY (text_codi);


--
-- Name: radicado_sec_temp pk_radicado_sec_temp; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado_sec_temp
    ADD CONSTRAINT pk_radicado_sec_temp PRIMARY KEY (depe_codi);


--
-- Name: respaldo_hist_eventos pk_resp_hist_eventos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_hist_eventos
    ADD CONSTRAINT pk_resp_hist_eventos PRIMARY KEY (resp_hist_eventos);


--
-- Name: respaldo_solicitud pk_resp_soli_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_solicitud
    ADD CONSTRAINT pk_resp_soli_codi PRIMARY KEY (resp_soli_codi);


--
-- Name: respaldo_estado pk_respaldo_estado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_estado
    ADD CONSTRAINT pk_respaldo_estado PRIMARY KEY (est_codi);


--
-- Name: respaldo_usuario pk_respaldo_usuario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_usuario
    ADD CONSTRAINT pk_respaldo_usuario PRIMARY KEY (resp_codi);


--
-- Name: respaldo_usuario_radicado pk_respaldo_usuario_radicado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_usuario_radicado
    ADD CONSTRAINT pk_respaldo_usuario_radicado PRIMARY KEY (resp_radi_codi);


--
-- Name: tarea pk_tarea; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea
    ADD CONSTRAINT pk_tarea PRIMARY KEY (tarea_codi);


--
-- Name: tarea_hist_eventos pk_tarea_hist_eventos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea_hist_eventos
    ADD CONSTRAINT pk_tarea_hist_eventos PRIMARY KEY (tarea_hist_codi);


--
-- Name: tarea_radi_respuesta pk_tarea_radi_respuesta; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea_radi_respuesta
    ADD CONSTRAINT pk_tarea_radi_respuesta PRIMARY KEY (tarea_resp_codi);


--
-- Name: tipo_certificado pk_tipo_certificado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_certificado
    ADD CONSTRAINT pk_tipo_certificado PRIMARY KEY (tipo_cert_codi);


--
-- Name: tiporad pk_tiporad; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiporad
    ADD CONSTRAINT pk_tiporad PRIMARY KEY (trad_codigo);


--
-- Name: titulo pk_titulo_tit_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulo
    ADD CONSTRAINT pk_titulo_tit_codi PRIMARY KEY (tit_codi);


--
-- Name: trd pk_trd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd
    ADD CONSTRAINT pk_trd PRIMARY KEY (trd_codi);


--
-- Name: trd_radicado pk_trd_radicado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd_radicado
    ADD CONSTRAINT pk_trd_radicado PRIMARY KEY (radi_nume_radi, trd_codi);


--
-- Name: usuarios pk_usua_codi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT pk_usua_codi PRIMARY KEY (usua_codi);


--
-- Name: usuario_notificacion pk_usuario_notificacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_notificacion
    ADD CONSTRAINT pk_usuario_notificacion PRIMARY KEY (id_mail, usua_destinatario);


--
-- Name: usuarios_radicado pk_usuario_radicado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_radicado
    ADD CONSTRAINT pk_usuario_radicado PRIMARY KEY (usua_radi_codi);


--
-- Name: usuarios_sesion pk_usuario_sesion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_sesion
    ADD CONSTRAINT pk_usuario_sesion PRIMARY KEY (usua_codi);


--
-- Name: usuario pk_view_usuario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT pk_view_usuario PRIMARY KEY (usua_codi);


--
-- Name: usuario_dependencia usuario_dependencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_dependencia
    ADD CONSTRAINT usuario_dependencia_pkey PRIMARY KEY (usua_codi_depe);


--
-- Name: usuarios_subrogacion usuarios_subrogacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_subrogacion
    ADD CONSTRAINT usuarios_subrogacion_pkey PRIMARY KEY (usua_subrogacion_codi);


--
-- Name: anex_pk_anex_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX anex_pk_anex_codigo ON public.anexos USING btree (anex_codigo) WITH (fillfactor='95');


--
-- Name: fki_depe_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_depe_codi ON public.usuarios USING btree (depe_codi) WITH (fillfactor='70');


--
-- Name: fki_historico_ttr_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_historico_ttr_codigo ON public.hist_eventos USING btree (sgd_ttr_codigo) WITH (fillfactor='100');


--
-- Name: fki_historico_usua_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_historico_usua_codi ON public.hist_eventos USING btree (usua_codi_ori) WITH (fillfactor='100');


--
-- Name: fki_historico_usua_codi_dest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_historico_usua_codi_dest ON public.hist_eventos USING btree (usua_codi_dest) WITH (fillfactor='100');


--
-- Name: fki_informados_radi_nume_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_informados_radi_nume_radi ON public.informados USING btree (radi_nume_radi) WITH (fillfactor='90');


--
-- Name: fki_informados_usua_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_informados_usua_codi ON public.informados USING btree (usua_codi) WITH (fillfactor='90');


--
-- Name: fki_radi_texto_radi_nume_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_radi_texto_radi_nume_radi ON public.radi_texto USING btree (radi_nume_radi) WITH (fillfactor='98');


--
-- Name: fki_radicado_radi_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_radicado_radi_tipo ON public.radicado USING btree (radi_tipo) WITH (fillfactor='80');


--
-- Name: idx_anexos_anex_codigo_varchar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_anexos_anex_codigo_varchar ON public.anexos USING btree (anex_codigo varchar_pattern_ops);


--
-- Name: idx_anexos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_anexos_tipo ON public.anexos_tipo USING btree (anex_tipo_codi) WITH (fillfactor='100');


--
-- Name: idx_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categoria ON public.categoria USING btree (cat_codi) WITH (fillfactor='100');


--
-- Name: idx_ciudadano_ciu_cedula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ciudadano_ciu_cedula ON public.ciudadano USING btree (ciu_cedula);


--
-- Name: idx_dependencia_depe_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencia_depe_nombre ON public.dependencia USING btree (depe_nomb);


--
-- Name: idx_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estado ON public.estado USING btree (esta_codi) WITH (fillfactor='90');


--
-- Name: idx_fechradi_usuaactu_estacodi_instactu_fechaden_estacodi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fechradi_usuaactu_estacodi_instactu_fechaden_estacodi ON public.radicado USING btree (radi_fech_radi, radi_usua_actu, esta_codi, radi_inst_actu, radi_fech_agend) WITH (fillfactor='80');


--
-- Name: idx_hist_eventos_usua_codi_ori_sgd_ttr_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hist_eventos_usua_codi_ori_sgd_ttr_codigo ON public.hist_eventos USING btree (usua_codi_ori, sgd_ttr_codigo) WITH (fillfactor='100');


--
-- Name: idx_inst_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_inst_codi ON public.institucion USING btree (inst_codi) WITH (fillfactor='90');


--
-- Name: idx_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login ON public.usuarios USING btree (usua_login) WITH (fillfactor='70');


--
-- Name: idx_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nombre ON public.institucion USING btree (inst_nombre) WITH (fillfactor='90');


--
-- Name: idx_opciones_impresion_radi_nume_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opciones_impresion_radi_nume_radi ON public.opciones_impresion USING btree (radi_nume_radi);


--
-- Name: idx_permiso_usuario_usua_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permiso_usuario_usua_codi ON public.permiso_usuario USING btree (usua_codi);


--
-- Name: idx_radi_nume_asoc_radi_nume_radi_esta_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radi_nume_asoc_radi_nume_radi_esta_codi ON public.radicado USING btree (radi_nume_asoc, radi_nume_radi, esta_codi);


--
-- Name: idx_radi_nume_radi_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radi_nume_radi_tipo ON public.usuarios_radicado USING btree (radi_nume_radi, radi_usua_tipo);


--
-- Name: idx_radicado_esta_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_esta_codi ON public.radicado USING btree (esta_codi) WITH (fillfactor='80');


--
-- Name: idx_radicado_inst_actu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_inst_actu ON public.radicado USING btree (radi_inst_actu) WITH (fillfactor='80');


--
-- Name: idx_radicado_radi_cca_array; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_cca_array ON public.radicado USING gin (string_to_array(btrim((radi_cca)::text, '-'::text), '--'::text));


--
-- Name: idx_radicado_radi_fech_ofic_radi_fech_firma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_fech_ofic_radi_fech_firma ON public.radicado USING btree (radi_fech_ofic, radi_fech_firma) WITH (fillfactor='80');


--
-- Name: idx_radicado_radi_fech_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_fech_radi ON public.radicado USING btree (radi_fech_radi) WITH (fillfactor='80');


--
-- Name: idx_radicado_radi_inst_actu_radi_usua_actu_esta_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_inst_actu_radi_usua_actu_esta_codi ON public.radicado USING btree (radi_inst_actu, radi_usua_actu, esta_codi) WITH (fillfactor='80');


--
-- Name: idx_radicado_radi_nume_deri; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_nume_deri ON public.radicado USING btree (radi_nume_deri);


--
-- Name: idx_radicado_radi_nume_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_radicado_radi_nume_radi ON public.radicado USING btree (radi_nume_radi) WITH (fillfactor='80');


--
-- Name: idx_radicado_radi_nume_temp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_nume_temp ON public.radicado USING btree (radi_nume_temp) WITH (fillfactor='80');


--
-- Name: idx_radicado_radi_nume_temp_radi_inst_actu_radi_usua_actu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_nume_temp_radi_inst_actu_radi_usua_actu ON public.radicado USING btree (radi_nume_temp, radi_inst_actu, radi_usua_actu) WITH (fillfactor='80');


--
-- Name: idx_radicado_radi_usua_actu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_usua_actu ON public.radicado USING btree (radi_usua_actu) WITH (fillfactor='80');


--
-- Name: idx_radicado_radi_usua_dest_array; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_usua_dest_array ON public.radicado USING gin (string_to_array(btrim((radi_usua_dest)::text, '-'::text), '--'::text));


--
-- Name: idx_radicado_radi_usua_rem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_usua_rem ON public.radicado USING gin (radi_usua_rem public.gin_trgm_ops);


--
-- Name: idx_radicado_radi_usua_rem_array; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radicado_radi_usua_rem_array ON public.radicado USING gin (string_to_array(btrim((radi_usua_rem)::text, '-'::text), '--'::text));


--
-- Name: idx_radinume_borrados; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radinume_borrados ON public.anexos USING btree (anex_radi_nume, anex_borrado) WITH (fillfactor='95');


--
-- Name: idx_radinumtex; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radinumtex ON public.radicado USING btree (radi_nume_text) WITH (fillfactor='80');


--
-- Name: idx_respaldo_usuario_radicado_radi_nume_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_respaldo_usuario_radicado_radi_nume_radi ON public.respaldo_usuario_radicado USING btree (radi_nume_radi);


--
-- Name: idx_respaldo_usuario_radicado_resp_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_respaldo_usuario_radicado_resp_codi ON public.respaldo_usuario_radicado USING btree (resp_codi);


--
-- Name: idx_sgd_ttr_trans; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sgd_ttr_trans ON public.sgd_ttr_transaccion USING btree (sgd_ttr_codigo) WITH (fillfactor='90');


--
-- Name: idx_tarea_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tarea_estado ON public.tarea USING btree (estado);


--
-- Name: idx_tarea_radi_nume_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tarea_radi_nume_radi ON public.tarea USING btree (radi_nume_radi);


--
-- Name: idx_tarea_usua_codi_ori; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tarea_usua_codi_ori ON public.tarea USING btree (usua_codi_ori);


--
-- Name: idx_tiporad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tiporad ON public.tiporad USING btree (trad_codigo) WITH (fillfactor='98');


--
-- Name: idx_tit_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tit_nombre ON public.titulo USING btree (tit_nombre) WITH (fillfactor='90');


--
-- Name: idx_trd_depe_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trd_depe_codi ON public.trd USING btree (depe_codi);


--
-- Name: idx_usua_cedula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usua_cedula ON public.usuarios USING btree (usua_cedula) WITH (fillfactor='70');


--
-- Name: idx_usua_esta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usua_esta ON public.usuarios USING btree (usua_esta) WITH (fillfactor='70');


--
-- Name: idx_usuario_depe_codi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_depe_codi ON public.usuario USING btree (depe_codi);


--
-- Name: idx_usuario_inst_codi_gt0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_inst_codi_gt0 ON public.usuario USING btree (inst_codi) WHERE (inst_codi > 0);


--
-- Name: idx_usuario_usua_cedula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_usua_cedula ON public.usuario USING btree (usua_cedula);


--
-- Name: idx_usuario_usua_datos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_usua_datos ON public.usuario USING gin (usua_datos public.gin_trgm_ops);


--
-- Name: idx_usuario_usua_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_usua_login ON public.usuario USING btree (usua_login);


--
-- Name: idx_usuario_usua_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_usua_nombre ON public.usuario USING btree (usua_nombre);


--
-- Name: idx_usuarios_radicado_ts_vector2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_radicado_ts_vector2 ON public.usuarios_radicado USING gin (to_tsvector('public.es'::regconfig, upper((((((COALESCE(usua_nombre, ''::character varying))::text || ' '::text) || (COALESCE(usua_apellido, ''::character varying))::text) || ' '::text) || (COALESCE(usua_institucion, ''::character varying))::text))));


--
-- Name: idx_usuarios_subrogacion_usua_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_subrogacion_usua_visible ON public.usuarios_subrogacion USING btree (usua_visible);


--
-- Name: idx_usuarios_translate_usua_cargo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_translate_usua_cargo ON public.usuarios USING gin (translate(upper((usua_cargo)::text), 'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ'::text, 'AEIOUAEIOUAEIOUN'::text) public.gin_trgm_ops);


--
-- Name: idx_usuarios_usua_cedula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_usua_cedula ON public.usuarios USING btree (usua_cedula);


--
-- Name: ind_anex_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ind_anex_radi ON public.anexos USING btree (anex_radi_nume) WITH (fillfactor='95');


--
-- Name: ind_archivo_nivel; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_archivo_nivel ON public.archivo_nivel USING btree (arch_codi, depe_codi) WITH (fillfactor='100');


--
-- Name: ind_archivo_radicado; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_archivo_radicado ON public.archivo_radicado USING btree (radi_nume_radi, arch_codi, anex_numero) WITH (fillfactor='100');


--
-- Name: ind_ciu_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_ciu_codigo ON public.ciudadano USING btree (ciu_codigo) WITH (fillfactor='90');


--
-- Name: ind_ciudad; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_ciudad ON public.ciudad USING btree (id) WITH (fillfactor='100');


--
-- Name: ind_ciudadano_tmp; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_ciudadano_tmp ON public.ciudadano_tmp USING btree (ciu_codigo) WITH (fillfactor='90');


--
-- Name: ind_expediente_nivel; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_expediente_nivel ON public.trd_nivel USING btree (trd_codi, depe_codi) WITH (fillfactor='100');


--
-- Name: ind_id_permiso; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_id_permiso ON public.permiso USING btree (id_permiso) WITH (fillfactor='98');


--
-- Name: ind_lista_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_lista_id ON public.lista USING btree (lista_codi) WITH (fillfactor='90');


--
-- Name: ind_lista_usuarios; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_lista_usuarios ON public.lista_usuarios USING btree (lista_codi, usua_codi) WITH (fillfactor='98');


--
-- Name: ind_permiso_cargo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_permiso_cargo ON public.permiso_usuario USING btree (id_permiso, usua_codi) WITH (fillfactor='90');


--
-- Name: ind_trd_radicado; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_trd_radicado ON public.trd_radicado USING btree (radi_nume_radi, trd_codi) WITH (fillfactor='95');


--
-- Name: ind_usuario_sesion; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ind_usuario_sesion ON public.usuarios_sesion USING btree (usua_codi) WITH (fillfactor='65');


--
-- Name: indradi_nume_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indradi_nume_radi ON public.usuarios_radicado USING btree (radi_nume_radi) WITH (fillfactor='100');


--
-- Name: padre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX padre ON public.archivo USING btree (arch_padre) WITH (fillfactor='70');


--
-- Name: pk_bandejacompartida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pk_bandejacompartida ON public.bandeja_compartida USING btree (ban_com_codi) WITH (fillfactor='100');


--
-- Name: pk_codificacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pk_codificacion ON public.codificacion USING btree (cod_codi) WITH (fillfactor='100');


--
-- Name: pk_depe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pk_depe ON public.dependencia USING btree (depe_codi) WITH (fillfactor='80');


--
-- Name: pk_listausuarios; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pk_listausuarios ON public.lista_usuarios USING btree (lista_codi) WITH (fillfactor='98');


--
-- Name: pk_opciones_impresionsobre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pk_opciones_impresionsobre ON public.opciones_impresion_sobre USING btree (opc_imp_sob_codi) WITH (fillfactor='90');


--
-- Name: pk_titulo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pk_titulo ON public.titulo USING btree (tit_codi) WITH (fillfactor='90');


--
-- Name: pkarchivo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pkarchivo ON public.archivo USING btree (arch_codi) WITH (fillfactor='70');


--
-- Name: pkformatonumeracio; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pkformatonumeracio ON public.formato_numeracion USING btree (depe_codi, fn_tiporad) WITH (fillfactor='70');


--
-- Name: pkradi_texto; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pkradi_texto ON public.radi_texto USING btree (text_codi) WITH (fillfactor='98');


--
-- Name: pkrespaldo_usuario_radicado; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pkrespaldo_usuario_radicado ON public.respaldo_usuario_radicado USING btree (resp_radi_codi) WITH (fillfactor='75');


--
-- Name: pkusuarios; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pkusuarios ON public.usuarios USING btree (usua_codi) WITH (fillfactor='70');


--
-- Name: radi_nume_radi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX radi_nume_radi ON public.hist_eventos USING btree (radi_nume_radi) WITH (fillfactor='100');


--
-- Name: ciudad trig_actualizar_view_usuario_ciudad; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trig_actualizar_view_usuario_ciudad AFTER UPDATE ON public.ciudad FOR EACH ROW EXECUTE FUNCTION public.func_actualizar_view_usuario_ciudad();


--
-- Name: ciudadano trig_actualizar_view_usuario_ciudadano; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trig_actualizar_view_usuario_ciudadano AFTER INSERT OR DELETE OR UPDATE ON public.ciudadano FOR EACH ROW EXECUTE FUNCTION public.func_actualizar_view_usuario_ciudadano();


--
-- Name: dependencia trig_actualizar_view_usuario_dependencia; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trig_actualizar_view_usuario_dependencia AFTER UPDATE ON public.dependencia FOR EACH ROW EXECUTE FUNCTION public.func_actualizar_view_usuario_dependencia();


--
-- Name: institucion trig_actualizar_view_usuario_institucion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trig_actualizar_view_usuario_institucion AFTER UPDATE ON public.institucion FOR EACH ROW EXECUTE FUNCTION public.func_actualizar_view_usuario_institucion();


--
-- Name: usuarios trig_actualizar_view_usuario_usuarios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trig_actualizar_view_usuario_usuarios AFTER INSERT OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.func_actualizar_view_usuario_usuarios();


--
-- Name: anexos fk_anexos_anex_radi_nume; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anexos
    ADD CONSTRAINT fk_anexos_anex_radi_nume FOREIGN KEY (anex_radi_nume) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: archivo fk_archivo_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo
    ADD CONSTRAINT fk_archivo_01 FOREIGN KEY (arch_padre) REFERENCES public.archivo(arch_codi);


--
-- Name: archivo_nivel fk_archivo_nivel_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_nivel
    ADD CONSTRAINT fk_archivo_nivel_01 FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: archivo_radicado fk_archivo_radicado_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_radicado
    ADD CONSTRAINT fk_archivo_radicado_01 FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: archivo_radicado fk_archivo_radicado_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_radicado
    ADD CONSTRAINT fk_archivo_radicado_02 FOREIGN KEY (arch_codi) REFERENCES public.archivo(arch_codi);


--
-- Name: archivo_radicado fk_archivo_radicado_03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_radicado
    ADD CONSTRAINT fk_archivo_radicado_03 FOREIGN KEY (usua_codi) REFERENCES public.usuarios(usua_codi);


--
-- Name: archivo_radicado fk_archivo_radicado_04; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo_radicado
    ADD CONSTRAINT fk_archivo_radicado_04 FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: ciudadano_tmp fk_ciudadano_tmp_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudadano_tmp
    ADD CONSTRAINT fk_ciudadano_tmp_01 FOREIGN KEY (ciu_codigo) REFERENCES public.ciudadano(ciu_codigo);


--
-- Name: usuarios fk_depe_codi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_depe_codi FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: permiso_usuario_dep fk_depe_codi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_usuario_dep
    ADD CONSTRAINT fk_depe_codi FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: dependencia fk_dependencia_dep_central; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencia
    ADD CONSTRAINT fk_dependencia_dep_central FOREIGN KEY (dep_central) REFERENCES public.dependencia(depe_codi);


--
-- Name: dependencia fk_dependencia_depe_codi_padre; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencia
    ADD CONSTRAINT fk_dependencia_depe_codi_padre FOREIGN KEY (depe_codi_padre) REFERENCES public.dependencia(depe_codi);


--
-- Name: dependencia fk_dependencia_depe_plantilla; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencia
    ADD CONSTRAINT fk_dependencia_depe_plantilla FOREIGN KEY (depe_plantilla) REFERENCES public.dependencia(depe_codi);


--
-- Name: dependencia fk_dependencia_institucion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencia
    ADD CONSTRAINT fk_dependencia_institucion FOREIGN KEY (inst_codi) REFERENCES public.institucion(inst_codi);


--
-- Name: formato_numeracion fk_formato_numeracion_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formato_numeracion
    ADD CONSTRAINT fk_formato_numeracion_01 FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: formato_numeracion fk_formato_numeracion_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formato_numeracion
    ADD CONSTRAINT fk_formato_numeracion_02 FOREIGN KEY (depe_numeracion) REFERENCES public.dependencia(depe_codi);


--
-- Name: formato_numeracion fk_formato_numeracion_03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formato_numeracion
    ADD CONSTRAINT fk_formato_numeracion_03 FOREIGN KEY (fn_tiporad) REFERENCES public.tiporad(trad_codigo);


--
-- Name: hist_eventos fk_historico_ttr_codigo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hist_eventos
    ADD CONSTRAINT fk_historico_ttr_codigo FOREIGN KEY (sgd_ttr_codigo) REFERENCES public.sgd_ttr_transaccion(sgd_ttr_codigo);


--
-- Name: hist_eventos fk_hitorico_radicado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hist_eventos
    ADD CONSTRAINT fk_hitorico_radicado FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: informados fk_informados_radi_nume_radi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informados
    ADD CONSTRAINT fk_informados_radi_nume_radi FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: informados fk_informados_usua_codi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informados
    ADD CONSTRAINT fk_informados_usua_codi FOREIGN KEY (usua_codi) REFERENCES public.usuarios(usua_codi);


--
-- Name: informados fk_informados_usua_info; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informados
    ADD CONSTRAINT fk_informados_usua_info FOREIGN KEY (usua_info) REFERENCES public.usuarios(usua_codi);


--
-- Name: lista fk_lista_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista
    ADD CONSTRAINT fk_lista_01 FOREIGN KEY (usua_codi) REFERENCES public.usuarios(usua_codi);


--
-- Name: lista fk_lista_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista
    ADD CONSTRAINT fk_lista_02 FOREIGN KEY (inst_codi) REFERENCES public.institucion(inst_codi);


--
-- Name: lista_usuarios fk_lista_usuarios_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_usuarios
    ADD CONSTRAINT fk_lista_usuarios_01 FOREIGN KEY (lista_codi) REFERENCES public.lista(lista_codi);


--
-- Name: metadatos fk_met; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metadatos
    ADD CONSTRAINT fk_met FOREIGN KEY (met_padre) REFERENCES public.metadatos(met_codi);


--
-- Name: metadatos fk_met_depe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metadatos
    ADD CONSTRAINT fk_met_depe FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: metadatos_radicado fk_met_radicado_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metadatos_radicado
    ADD CONSTRAINT fk_met_radicado_01 FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: metadatos_radicado fk_met_radicado_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metadatos_radicado
    ADD CONSTRAINT fk_met_radicado_02 FOREIGN KEY (met_codi) REFERENCES public.metadatos(met_codi);


--
-- Name: metadatos_radicado fk_met_radicado_03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metadatos_radicado
    ADD CONSTRAINT fk_met_radicado_03 FOREIGN KEY (usua_codi) REFERENCES public.usuarios(usua_codi);


--
-- Name: permiso_usuario fk_permiso_cargo_id_permiso; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_usuario
    ADD CONSTRAINT fk_permiso_cargo_id_permiso FOREIGN KEY (id_permiso) REFERENCES public.permiso(id_permiso);


--
-- Name: permiso_usuario_dep fk_permiso_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_usuario_dep
    ADD CONSTRAINT fk_permiso_usuario FOREIGN KEY (id_permiso) REFERENCES public.permiso(id_permiso);


--
-- Name: radicado fk_radi_final_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT fk_radi_final_estado FOREIGN KEY (esta_codi) REFERENCES public.estado(esta_codi);


--
-- Name: radi_texto fk_radi_texto_radi_nume_radi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radi_texto
    ADD CONSTRAINT fk_radi_texto_radi_nume_radi FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: usuarios_radicado fk_radi_usua_radi_nume_radi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_radicado
    ADD CONSTRAINT fk_radi_usua_radi_nume_radi FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: radicado fk_radicado_institucion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT fk_radicado_institucion FOREIGN KEY (radi_inst_actu) REFERENCES public.institucion(inst_codi);


--
-- Name: radicado fk_radicado_radi_padre; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT fk_radicado_radi_padre FOREIGN KEY (radi_nume_deri) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: radicado fk_radicado_radi_temp; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT fk_radicado_radi_temp FOREIGN KEY (radi_nume_temp) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: radicado fk_radicado_radi_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT fk_radicado_radi_tipo FOREIGN KEY (radi_tipo) REFERENCES public.tiporad(trad_codigo);


--
-- Name: radicado fk_radicado_radi_usua_actu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT fk_radicado_radi_usua_actu FOREIGN KEY (radi_usua_actu) REFERENCES public.usuarios(usua_codi);


--
-- Name: radicado fk_radicado_radi_usua_ante; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT fk_radicado_radi_usua_ante FOREIGN KEY (radi_usua_ante) REFERENCES public.usuarios(usua_codi);


--
-- Name: radicado fk_radicado_radi_usua_radi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radicado
    ADD CONSTRAINT fk_radicado_radi_usua_radi FOREIGN KEY (radi_usua_radi) REFERENCES public.usuarios(usua_codi);


--
-- Name: respaldo_solicitud fk_respaldo_solicitud_radicado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_solicitud
    ADD CONSTRAINT fk_respaldo_solicitud_radicado FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: respaldo_usuario fk_respaldo_usuario_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_usuario
    ADD CONSTRAINT fk_respaldo_usuario_01 FOREIGN KEY (usua_codi) REFERENCES public.usuarios(usua_codi);


--
-- Name: respaldo_usuario_radicado fk_respaldo_usuario_radicado_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_usuario_radicado
    ADD CONSTRAINT fk_respaldo_usuario_radicado_01 FOREIGN KEY (resp_codi) REFERENCES public.respaldo_usuario(resp_codi);


--
-- Name: respaldo_usuario_radicado fk_respaldo_usuario_radicado_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.respaldo_usuario_radicado
    ADD CONSTRAINT fk_respaldo_usuario_radicado_02 FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: tarea fk_tarea_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea
    ADD CONSTRAINT fk_tarea_01 FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: tarea fk_tarea_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea
    ADD CONSTRAINT fk_tarea_02 FOREIGN KEY (usua_codi_ori) REFERENCES public.usuarios(usua_codi);


--
-- Name: tarea fk_tarea_03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea
    ADD CONSTRAINT fk_tarea_03 FOREIGN KEY (usua_codi_dest) REFERENCES public.usuarios(usua_codi);


--
-- Name: tarea fk_tarea_04; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea
    ADD CONSTRAINT fk_tarea_04 FOREIGN KEY (tarea_codi_padre) REFERENCES public.tarea(tarea_codi);


--
-- Name: tarea_hist_eventos fk_tarea_hist_eventos_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea_hist_eventos
    ADD CONSTRAINT fk_tarea_hist_eventos_01 FOREIGN KEY (tarea_codi) REFERENCES public.tarea(tarea_codi);


--
-- Name: tarea_hist_eventos fk_tarea_hist_eventos_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea_hist_eventos
    ADD CONSTRAINT fk_tarea_hist_eventos_02 FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: tarea_hist_eventos fk_tarea_hist_eventos_03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea_hist_eventos
    ADD CONSTRAINT fk_tarea_hist_eventos_03 FOREIGN KEY (usua_codi_ori) REFERENCES public.usuarios(usua_codi);


--
-- Name: tarea_radi_respuesta fk_tarea_radi_respuesta_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea_radi_respuesta
    ADD CONSTRAINT fk_tarea_radi_respuesta_01 FOREIGN KEY (tarea_codi) REFERENCES public.tarea(tarea_codi);


--
-- Name: tarea_radi_respuesta fk_tarea_radi_respuesta_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea_radi_respuesta
    ADD CONSTRAINT fk_tarea_radi_respuesta_02 FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: tarea_radi_respuesta fk_tarea_radi_respuesta_03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarea_radi_respuesta
    ADD CONSTRAINT fk_tarea_radi_respuesta_03 FOREIGN KEY (radi_nume_resp) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: trd fk_trd_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd
    ADD CONSTRAINT fk_trd_01 FOREIGN KEY (trd_padre) REFERENCES public.trd(trd_codi);


--
-- Name: trd fk_trd_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd
    ADD CONSTRAINT fk_trd_02 FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: trd_radicado fk_trd_radicado_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd_radicado
    ADD CONSTRAINT fk_trd_radicado_01 FOREIGN KEY (radi_nume_radi) REFERENCES public.radicado(radi_nume_radi);


--
-- Name: trd_radicado fk_trd_radicado_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd_radicado
    ADD CONSTRAINT fk_trd_radicado_02 FOREIGN KEY (trd_codi) REFERENCES public.trd(trd_codi);


--
-- Name: trd_radicado fk_trd_radicado_03; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd_radicado
    ADD CONSTRAINT fk_trd_radicado_03 FOREIGN KEY (usua_codi) REFERENCES public.usuarios(usua_codi);


--
-- Name: trd_radicado fk_trd_radicado_04; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trd_radicado
    ADD CONSTRAINT fk_trd_radicado_04 FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: metadatos_radicado fk_trd_radicado_04; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metadatos_radicado
    ADD CONSTRAINT fk_trd_radicado_04 FOREIGN KEY (depe_codi) REFERENCES public.dependencia(depe_codi);


--
-- Name: permiso_usuario fk_usua_codi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_usuario
    ADD CONSTRAINT fk_usua_codi FOREIGN KEY (usua_codi) REFERENCES public.usuarios(usua_codi);


--
-- Name: permiso_usuario_dep fk_usua_codi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_usuario_dep
    ADD CONSTRAINT fk_usua_codi FOREIGN KEY (usua_codi) REFERENCES public.usuarios(usua_codi);


--
-- Name: usuarios fk_usuario_institucion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuario_institucion FOREIGN KEY (inst_codi) REFERENCES public.institucion(inst_codi);


--
-- Name: usuarios fk_usuarios_tipo_certificado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuarios_tipo_certificado FOREIGN KEY (usua_tipo_certificado) REFERENCES public.tipo_certificado(tipo_cert_codi);


--
-- Name: anexos pk_anexos_anex_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anexos
    ADD CONSTRAINT pk_anexos_anex_tipo FOREIGN KEY (anex_tipo) REFERENCES public.anexos_tipo(anex_tipo_codi);


--
-- PostgreSQL database dump complete
--

\unrestrict I1FhfWrsIRQ5vz9XvP059006LegAdqyjB3TL6EXKMOv1ZD50JtRynnANOL8wcPi

