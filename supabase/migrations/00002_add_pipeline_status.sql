alter table interactions add column pipeline_status text;

create index idx_interactions_pipeline_status on interactions(pipeline_status);
