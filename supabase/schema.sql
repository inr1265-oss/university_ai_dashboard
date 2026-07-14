-- articles 테이블: 한국대학신문에서 수집한 AIDX/AID/AI 관련 기사
--
-- 실행 방법: Supabase 프로젝트의 SQL Editor에 이 파일 내용을 붙여넣고 실행하거나,
-- Supabase CLI를 사용하는 경우 마이그레이션으로 등록해서 적용한다.

create table if not exists public.articles (
  id bigint generated always as identity primary key,
  title text not null,
  url text not null unique,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  category text,
  summary text,
  raw_content text
);

comment on table public.articles is '한국대학신문 AIDX/AID/AI 관련 수집 기사';
comment on column public.articles.title is '기사 제목';
comment on column public.articles.url is '기사 원문 URL (중복 판단 기준, unique)';
comment on column public.articles.published_at is '기사 게재일시 (RSS pubDate 파싱값)';
comment on column public.articles.collected_at is '크롤러가 이 기사를 수집한 시각';
comment on column public.articles.category is 'LLM이 분류한 카테고리 (요약 단계에서 채워짐)';
comment on column public.articles.summary is 'LLM이 생성한 3줄 요약 (요약 단계에서 채워짐)';
comment on column public.articles.raw_content is '요약 이전 원문/본문 텍스트 (RSS 요약 또는 크롤링한 본문)';

-- 대시보드에서 카테고리별/날짜별 조회를 빠르게 하기 위한 인덱스.
-- url은 unique 제약으로 이미 인덱스가 생성되며, upsert(onConflict: 'url')가 이 인덱스를 사용해
-- 중복 기사를 판별하고 스킵한다.
create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_category_idx on public.articles (category);

-- Row Level Security
-- 기본적으로 활성화한다. 크롤러(GitHub Actions 등 서버 환경)는 RLS를 우회하는
-- service_role 키를 사용하므로 아래 정책 여부와 무관하게 insert/upsert가 가능하다.
-- 대시보드(브라우저)에서 anon 키로 직접 조회해야 한다면, 아래처럼 읽기 전용 정책을
-- 대시보드 구현 단계에서 필요에 맞게 추가한다.
alter table public.articles enable row level security;

-- 예시(대시보드 단계에서 필요 시 주석 해제):
-- create policy "Allow public read access" on public.articles
--   for select
--   to anon
--   using (true);
