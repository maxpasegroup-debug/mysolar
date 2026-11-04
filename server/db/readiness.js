// Older/newer or changed migration history is not an approved rollback target.
export function matchesMigrationManifest(expected,installed){
 if(installed.length!==expected.length)return false;
 const rows=new Map(installed.map(row=>[row.name,row.checksum]));
 return rows.size===expected.length&&expected.every(row=>rows.get(row.name)===row.checksum);
}
