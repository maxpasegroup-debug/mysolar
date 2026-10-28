CREATE TABLE company_setup_choices (
 company_id uuid PRIMARY KEY REFERENCES companies(id),
 offers_mode text NOT NULL DEFAULT 'undecided' CHECK(offers_mode IN ('undecided','use_offers','not_needed','later')),
 team_mode text NOT NULL DEFAULT 'undecided' CHECK(team_mode IN ('undecided','invite_team','solo','later')),
 opening_mode text NOT NULL DEFAULT 'undecided' CHECK(opening_mode IN ('undecided','start_fresh','reviewed','later')),
 communications_reviewed boolean NOT NULL DEFAULT false,
 updated_by uuid NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
