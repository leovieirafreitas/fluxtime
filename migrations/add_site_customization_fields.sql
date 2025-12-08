-- ============================================
-- MIGRATION: Adicionar Campos de Customização
-- Data: 2025-12-08
-- Projeto: FluxTime
-- ============================================

-- INSTRUÇÕES:
-- 1. Acesse: https://efyivbwumwhakzdpfarn.supabase.co/project/efyivbwumwhakzdpfarn/editor
-- 2. Clique em "SQL Editor" no menu lateral
-- 3. Clique em "+ New query"
-- 4. Cole este código completo
-- 5. Clique em "Run" ou pressione Ctrl+Enter

-- ============================================
-- ADICIONAR CAMPOS NA TABELA COMPANIES
-- ============================================

-- Adicionar campos de customização
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS custom_link TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS slogan TEXT,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS remove_branding BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_business_hours BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#6366f1';

-- ============================================
-- ADICIONAR COMENTÁRIOS (DOCUMENTAÇÃO)
-- ============================================

COMMENT ON COLUMN public.companies.custom_link IS 'Link personalizado para o site da empresa (ex: minhaempresa). Será usado em: https://pro.quaddro.co/fluxtime/{custom_link}';
COMMENT ON COLUMN public.companies.logo_url IS 'URL da logo ou foto de perfil da empresa exibida no site';
COMMENT ON COLUMN public.companies.slogan IS 'Slogan da empresa exibido no site';
COMMENT ON COLUMN public.companies.cover_image IS 'URL da imagem de capa do site (banner principal)';
COMMENT ON COLUMN public.companies.remove_branding IS 'Se true, remove a marca "Feito com Quaddro" do site público';
COMMENT ON COLUMN public.companies.show_business_hours IS 'Se true, exibe o horário de funcionamento no site público';
COMMENT ON COLUMN public.companies.accent_color IS 'Cor de destaque do site em formato hexadecimal (ex: #6366f1)';

-- ============================================
-- VERIFICAR SE FOI CRIADO COM SUCESSO
-- ============================================

-- Execute esta query para verificar:
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'companies'
AND column_name IN (
    'custom_link',
    'logo_url',
    'slogan',
    'cover_image',
    'remove_branding',
    'show_business_hours',
    'accent_color'
)
ORDER BY column_name;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Você deve ver 7 linhas com os seguintes campos:
-- 1. accent_color       | text    | '#6366f1'::text | YES
-- 2. cover_image        | text    | NULL            | YES
-- 3. custom_link        | text    | NULL            | YES
-- 4. logo_url           | text    | NULL            | YES
-- 5. remove_branding    | boolean | false           | YES
-- 6. show_business_hours| boolean | true            | YES
-- 7. slogan             | text    | NULL            | YES
-- ============================================
