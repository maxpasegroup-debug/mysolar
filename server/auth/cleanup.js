// Called only by the explicit maintenance runner inside its transaction.
// Keep verified-but-unconsumed proofs until expiry; never delete user/audit records.
export async function cleanupAuthChallenges(db){
 const registration=await db.query('DELETE FROM registration_challenges WHERE expires_at<=now() OR used_at IS NOT NULL');
 const recovery=await db.query('DELETE FROM password_reset_challenges WHERE expires_at<=now() OR used_at IS NOT NULL');
 return {registration:registration.rowCount,recovery:recovery.rowCount};
}
