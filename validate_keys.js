
import webpush from 'web-push';

const publicKey = 'BKaf0mfF_6CH6z30N48VErxSfc-CwSqcd-COM2VEv3cgTivebwA8jk-I50YDrZCtM_zFLsXRhtOYVm9I5rlb41E';
const privateKey = '9P-Wc1H01bsVdyJct1C02WIHYSGir5QHjDJvIYtrOiM';

try {
    webpush.setVapidDetails(
        'mailto:test@test.com',
        publicKey,
        privateKey
    );
    console.log("KEYS ARE VALID!");
} catch (error) {
    console.error("KEYS ARE INVALID:", error.message);
}
