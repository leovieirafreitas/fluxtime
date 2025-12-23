@echo off
echo Configurando VAPID Keys no Supabase...
call npx supabase secrets set --project-ref efyivbwumwhakzdpfarn VAPID_PUBLIC_KEY=BKaf0mfF_6CH6z30N48VErxSfc-CwSqcd-COM2VEv3cgTivebwA8jk-I50YDrZCtM_zFLsXRhtOYVm9I5rlb41E VAPID_PRIVATE_KEY=9P-Wc1H01bsVdyJct1C02WIHYSGir5QHjDJvIYtrOiM
pause
