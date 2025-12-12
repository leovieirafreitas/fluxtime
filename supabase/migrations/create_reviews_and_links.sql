-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create company_links table
CREATE TABLE IF NOT EXISTS public.company_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    instagram TEXT,
    facebook TEXT,
    website TEXT,
    ebook TEXT,
    whatsapp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_company_id ON public.reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_links_company_id ON public.company_links(company_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews (public read, authenticated write)
CREATE POLICY "Anyone can read reviews"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (true);

-- RLS Policies for company_links (public read, company members can write)
CREATE POLICY "Anyone can read company links"
    ON public.company_links FOR SELECT
    USING (true);

CREATE POLICY "Company members can manage their links"
    ON public.company_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id = company_links.company_id
        )
    );
