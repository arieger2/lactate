--
-- PostgreSQL database dump
--

\restrict kbvarwrqZ2JcxufnTWS8EnDKR69dgmPXnW2urSrEGDwgPMwnXOAhKEaPL4PiowV

-- Dumped from database version 17.7 (Ubuntu 17.7-3.pgdg22.04+1)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: hypertable; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.hypertable (id, schema_name, table_name, associated_schema_name, associated_table_prefix, num_dimensions, chunk_sizing_func_schema, chunk_sizing_func_name, chunk_target_size, compression_state, compressed_hypertable_id, status) FROM stdin;
\.


--
-- Data for Name: chunk; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.chunk (id, hypertable_id, schema_name, table_name, compressed_chunk_id, dropped, status, osm_chunk, creation_time) FROM stdin;
\.


--
-- Data for Name: chunk_column_stats; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.chunk_column_stats (id, hypertable_id, chunk_id, column_name, range_start, range_end, valid) FROM stdin;
\.


--
-- Data for Name: dimension; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.dimension (id, hypertable_id, column_name, column_type, aligned, num_slices, partitioning_func_schema, partitioning_func, interval_length, compress_interval_length, integer_now_func_schema, integer_now_func) FROM stdin;
\.


--
-- Data for Name: dimension_slice; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.dimension_slice (id, dimension_id, range_start, range_end) FROM stdin;
\.


--
-- Data for Name: chunk_constraint; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.chunk_constraint (chunk_id, dimension_slice_id, constraint_name, hypertable_constraint_name) FROM stdin;
\.


--
-- Data for Name: compression_chunk_size; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.compression_chunk_size (chunk_id, compressed_chunk_id, uncompressed_heap_size, uncompressed_toast_size, uncompressed_index_size, compressed_heap_size, compressed_toast_size, compressed_index_size, numrows_pre_compression, numrows_post_compression, numrows_frozen_immediately) FROM stdin;
\.


--
-- Data for Name: compression_settings; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.compression_settings (relid, compress_relid, segmentby, orderby, orderby_desc, orderby_nullsfirst, index) FROM stdin;
\.


--
-- Data for Name: continuous_agg; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_agg (mat_hypertable_id, raw_hypertable_id, parent_mat_hypertable_id, user_view_schema, user_view_name, partial_view_schema, partial_view_name, direct_view_schema, direct_view_name, materialized_only, finalized) FROM stdin;
\.


--
-- Data for Name: continuous_agg_migrate_plan; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_agg_migrate_plan (mat_hypertable_id, start_ts, end_ts, user_view_definition) FROM stdin;
\.


--
-- Data for Name: continuous_agg_migrate_plan_step; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_agg_migrate_plan_step (mat_hypertable_id, step_id, status, start_ts, end_ts, type, config) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_bucket_function; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_aggs_bucket_function (mat_hypertable_id, bucket_func, bucket_width, bucket_origin, bucket_offset, bucket_timezone, bucket_fixed_width) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_hypertable_invalidation_log; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_aggs_hypertable_invalidation_log (hypertable_id, lowest_modified_value, greatest_modified_value) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_invalidation_threshold; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_aggs_invalidation_threshold (hypertable_id, watermark) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_materialization_invalidation_log; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_aggs_materialization_invalidation_log (materialization_id, lowest_modified_value, greatest_modified_value) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_materialization_ranges; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_aggs_materialization_ranges (materialization_id, lowest_modified_value, greatest_modified_value) FROM stdin;
\.


--
-- Data for Name: continuous_aggs_watermark; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.continuous_aggs_watermark (mat_hypertable_id, watermark) FROM stdin;
\.


--
-- Data for Name: metadata; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.metadata (key, value, include_in_telemetry) FROM stdin;
install_timestamp	2025-11-25 09:12:47.176188+00	t
timescaledb_version	2.23.0	f
exported_uuid	2d84c5a2-85ac-4858-8916-cbd2b2d2d73c	t
\.


--
-- Data for Name: tablespace; Type: TABLE DATA; Schema: _timescaledb_catalog; Owner: postgres
--

COPY _timescaledb_catalog.tablespace (id, hypertable_id, tablespace_name) FROM stdin;
\.


--
-- Data for Name: bgw_job; Type: TABLE DATA; Schema: _timescaledb_config; Owner: postgres
--

COPY _timescaledb_config.bgw_job (id, application_name, schedule_interval, max_runtime, max_retries, retry_period, proc_schema, proc_name, owner, scheduled, fixed_schedule, initial_start, hypertable_id, config, check_schema, check_name, timezone) FROM stdin;
\.


--
-- Data for Name: patient_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_profiles (profile_id, first_name, last_name, birth_date, height_cm, weight_kg, email, phone, additional_notes, created_at, updated_at) FROM stdin;
CUST-1764578294333	Alexander	Rieger	\N	\N	\N	mail@alexander-rieger.de	\N	\N	2025-12-01 08:38:14.346206	2025-12-01 08:38:14.346206
CUST-1764603534153	Max	Mustermann	2000-10-10	\N	\N	\N	\N	\N	2025-12-01 15:38:54.194384	2025-12-01 15:38:54.194384
\.


--
-- Data for Name: test_infos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.test_infos (test_id, profile_id, test_date, test_time, device, unit, start_load, increment, stage_duration_min, created_at, updated_at) FROM stdin;
TEST-1764578292956	CUST-1764578294333	2025-12-01	09:38:00	bike	watt	50.00	50.00	3	2025-12-01 08:38:14.368035	2025-12-01 08:38:14.368035
TEST-1764603488677	CUST-1764603534153	2025-12-01	12:56:00	bike	watt	100.00	25.00	3	2025-12-01 15:38:54.339202	2025-12-01 15:38:54.339202
TEST-1764603685736	CUST-1764603534153	2025-12-01	16:38:00	bike	watt	120.00	30.00	3	2025-12-01 15:41:25.754786	2025-12-01 15:41:25.754786
TEST-1764603772628	CUST-1764603534153	2025-12-01	16:41:00	bike	watt	150.00	30.00	3	2025-12-01 15:42:52.635999	2025-12-01 15:42:52.635999
TEST-1764603900886	CUST-1764603534153	2025-12-01	16:42:00	treadmill	kmh	8.00	1.00	3	2025-12-01 15:45:00.903369	2025-12-01 15:45:00.903369
TEST-1764617064397	CUST-1764603534153	2025-12-01	20:21:00	treadmill	kmh	7.50	1.50	3	2025-12-01 19:24:24.418622	2025-12-01 19:24:24.418622
TEST-1764617202540	CUST-1764603534153	2025-12-01	20:24:00	treadmill	kmh	8.00	1.00	3	2025-12-01 19:26:42.565101	2025-12-01 19:26:42.565101
\.


--
-- Data for Name: adjusted_thresholds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.adjusted_thresholds (id, test_id, profile_id, lt1_load, lt1_lactate, lt2_load, lt2_lactate, adjusted_at, created_at, updated_at) FROM stdin;
4	TEST-1764603900886	CUST-1764603534153	174	1.26	240	2.10	2025-12-01 15:54:53.752	2025-12-01 15:54:53.760251	2025-12-01 15:54:53.760251
6	TEST-1764603488677	CUST-1764603534153	174	1.26	240	2.10	2025-12-01 15:57:52.365	2025-12-01 15:57:52.370905	2025-12-01 15:57:52.370905
12	TEST-1764617064397	CUST-1764603534153	12.1	2.50	13.3	3.50	2025-12-01 19:34:19.717	2025-12-01 19:34:19.730013	2025-12-01 19:34:19.730013
1	TEST-1764603772628	CUST-1764603534153	9.4	1.30	13.7	4.00	2025-12-01 19:34:26.314	2025-12-01 15:47:28.142094	2025-12-01 19:34:26.322994
8	TEST-1764617202540	CUST-1764603534153	11	1.70	13.6	4.00	2025-12-01 19:53:32.635	2025-12-01 19:33:40.096218	2025-12-01 19:53:32.646034
2	TEST-1764603685736	CUST-1764603534153	174	1.26	240	2.10	2025-12-01 21:36:04.239	2025-12-01 15:47:34.522622	2025-12-01 21:36:04.24745
17	TEST-1764578292956	CUST-1764578294333	100	1.20	250	3.20	2025-12-01 22:14:22.103	2025-12-01 21:40:50.32729	2025-12-01 22:14:22.11757
\.


--
-- Data for Name: stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stages (id, test_id, stage, duration_min, load, heart_rate_bpm, lactate_mmol, rr_systolic, rr_diastolic, is_final_approximation, notes, created_at) FROM stdin;
1	TEST-1764603488677	1	3	100.00	120	1.00	\N	\N	f	\N	2025-12-01 15:39:02.365648
3	TEST-1764603488677	2	3	125.00	132	1.20	\N	\N	f	\N	2025-12-01 15:39:30.099892
5	TEST-1764603488677	3	3	150.00	142	1.40	\N	\N	f	\N	2025-12-01 15:39:42.829
7	TEST-1764603488677	4	3	175.00	153	1.80	\N	\N	f	\N	2025-12-01 15:39:53.666742
9	TEST-1764603488677	5	3	200.00	164	2.40	\N	\N	f	\N	2025-12-01 15:40:03.185432
11	TEST-1764603488677	6	3	225.00	173	3.10	\N	\N	f	\N	2025-12-01 15:40:13.803725
13	TEST-1764603488677	7	3	250.00	181	4.80	\N	\N	f	\N	2025-12-01 15:40:25.486646
15	TEST-1764603685736	1	3	120.00	118	1.30	\N	\N	f	\N	2025-12-01 15:41:37.651994
17	TEST-1764603685736	2	3	150.00	133	1.50	\N	\N	f	\N	2025-12-01 15:41:47.813388
19	TEST-1764603685736	3	3	180.00	146	1.80	\N	\N	f	\N	2025-12-01 15:41:56.024984
21	TEST-1764603685736	4	3	210.00	159	2.50	\N	\N	f	\N	2025-12-01 15:42:04.395727
23	TEST-1764603685736	5	3	240.00	172	3.40	\N	\N	f	\N	2025-12-01 15:42:13.577919
25	TEST-1764603685736	6	3	270.00	182	5.20	\N	\N	f	\N	2025-12-01 15:42:22.506861
27	TEST-1764603772628	1	3	150.00	126	1.10	\N	\N	f	\N	2025-12-01 15:43:01.397938
29	TEST-1764603772628	2	3	180.00	138	1.30	\N	\N	f	\N	2025-12-01 15:43:10.496408
31	TEST-1764603772628	3	3	210.00	149	1.60	\N	\N	f	\N	2025-12-01 15:43:20.897087
33	TEST-1764603772628	4	3	240.00	160	2.10	\N	\N	f	\N	2025-12-01 15:43:28.393956
35	TEST-1764603772628	5	3	270.00	170	3.00	\N	\N	f	\N	2025-12-01 15:43:38.620533
37	TEST-1764603772628	6	3	300.00	178	4.20	\N	\N	f	\N	2025-12-01 15:43:51.448475
39	TEST-1764603772628	7	3	330.00	186	6.10	\N	\N	f	\N	2025-12-01 15:44:06.909519
41	TEST-1764603900886	1	3	8.00	130	0.90	\N	\N	f	\N	2025-12-01 15:45:11.525723
43	TEST-1764603900886	2	3	9.00	141	1.10	\N	\N	f	\N	2025-12-01 15:45:19.589728
45	TEST-1764603900886	3	3	10.00	150	1.30	\N	\N	f	\N	2025-12-01 15:45:28.534966
47	TEST-1764603900886	4	3	11.00	160	1.70	\N	\N	f	\N	2025-12-01 15:45:37.987345
49	TEST-1764603900886	5	3	12.00	169	2.30	\N	\N	f	\N	2025-12-01 15:45:46.551322
51	TEST-1764603900886	6	3	13.00	178	3.40	\N	\N	f	\N	2025-12-01 15:45:57.151263
53	TEST-1764603900886	7	3	14.00	186	5.10	\N	\N	f	\N	2025-12-01 15:46:05.987226
55	TEST-1764617064397	1	3	7.50	128	1.00	\N	\N	f	\N	2025-12-01 19:24:35.200597
57	TEST-1764617064397	2	3	9.00	140	1.20	\N	\N	f	\N	2025-12-01 19:24:44.907534
59	TEST-1764617064397	3	3	10.50	152	1.60	\N	\N	f	\N	2025-12-01 19:24:54.977888
64	TEST-1764617064397	4	3	12.00	164	2.40	\N	\N	f	\N	2025-12-01 19:25:48.145243
66	TEST-1764617064397	5	3	13.50	176	3.70	\N	\N	f	\N	2025-12-01 19:26:00.682253
68	TEST-1764617064397	6	3	15.00	187	5.90	\N	\N	f	\N	2025-12-01 19:26:10.778227
70	TEST-1764617202540	1	3	8.50	134	1.20	\N	\N	f	\N	2025-12-01 19:27:01.411233
72	TEST-1764617202540	2	3	9.50	144	1.30	\N	\N	f	\N	2025-12-01 19:27:11.199095
74	TEST-1764617202540	3	3	10.50	153	1.50	\N	\N	f	\N	2025-12-01 19:27:20.059611
76	TEST-1764617202540	4	3	11.50	163	1.90	\N	\N	f	\N	2025-12-01 19:27:41.243861
78	TEST-1764617202540	5	3	12.50	172	2.80	\N	\N	f	\N	2025-12-01 19:27:52.076309
80	TEST-1764617202540	6	3	13.50	180	3.90	\N	\N	f	\N	2025-12-01 19:28:03.203221
82	TEST-1764617202540	7	3	14.50	187	5.80	\N	\N	f	\N	2025-12-01 19:28:11.104856
\.


--
-- Data for Name: threshold_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.threshold_results (id, test_id, method, lt1_load, lt1_lactate, lt2_load, lt2_lactate, calculated_at) FROM stdin;
\.


--
-- Data for Name: training_zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.training_zones (id, test_id, method, zone_number, zone_name, load_min, load_max, lactate_range, description, calculated_at) FROM stdin;
\.


--
-- Name: chunk_column_stats_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: postgres
--

SELECT pg_catalog.setval('_timescaledb_catalog.chunk_column_stats_id_seq', 1, false);


--
-- Name: chunk_constraint_name; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: postgres
--

SELECT pg_catalog.setval('_timescaledb_catalog.chunk_constraint_name', 1, false);


--
-- Name: chunk_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: postgres
--

SELECT pg_catalog.setval('_timescaledb_catalog.chunk_id_seq', 1, false);


--
-- Name: continuous_agg_migrate_plan_step_step_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: postgres
--

SELECT pg_catalog.setval('_timescaledb_catalog.continuous_agg_migrate_plan_step_step_id_seq', 1, false);


--
-- Name: dimension_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: postgres
--

SELECT pg_catalog.setval('_timescaledb_catalog.dimension_id_seq', 1, false);


--
-- Name: dimension_slice_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: postgres
--

SELECT pg_catalog.setval('_timescaledb_catalog.dimension_slice_id_seq', 1, false);


--
-- Name: hypertable_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_catalog; Owner: postgres
--

SELECT pg_catalog.setval('_timescaledb_catalog.hypertable_id_seq', 1, false);


--
-- Name: bgw_job_id_seq; Type: SEQUENCE SET; Schema: _timescaledb_config; Owner: postgres
--

SELECT pg_catalog.setval('_timescaledb_config.bgw_job_id_seq', 1000, false);


--
-- Name: adjusted_thresholds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.adjusted_thresholds_id_seq', 29, true);


--
-- Name: stages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stages_id_seq', 83, true);


--
-- Name: threshold_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.threshold_results_id_seq', 1, false);


--
-- Name: training_zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.training_zones_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict kbvarwrqZ2JcxufnTWS8EnDKR69dgmPXnW2urSrEGDwgPMwnXOAhKEaPL4PiowV

