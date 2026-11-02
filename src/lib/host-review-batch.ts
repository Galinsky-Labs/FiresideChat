import { candidateKey, HostReviewError, parseCandidate, parseEvidence } from "./host-review";

/** Validate entire bounded import before the first remote write; all records remain PENDING. */
export function preflightHostReviewJsonl(source:string): Record<string,unknown>[] {
  if (source.length > 2_000_000) throw new HostReviewError("BATCH_TOO_LARGE");
  const lines=source.split(/\r?\n/).filter(line=>line.trim());
  if (lines.length<1 || lines.length>1000) throw new HostReviewError("INVALID_BATCH_SIZE");
  const seen=new Set<string>();
  return lines.map((line,index)=>{
    if (line.length>8192) throw new HostReviewError("BATCH_LINE_TOO_LONG");
    let parsed:unknown;
    try {parsed=JSON.parse(line);} catch {throw new HostReviewError("INVALID_BATCH_JSON_AT_"+(index+1));}
    if (!parsed || typeof parsed!=="object" || Array.isArray(parsed)) throw new HostReviewError("INVALID_BATCH_RECORD");
    const record=parsed as Record<string,unknown>;
    const candidate=parseCandidate(record);
    if(record.sourceUrl) parseEvidence(record);
    const key=candidateKey(candidate);
    if(seen.has(key)) throw new HostReviewError("DUPLICATE_BATCH_CANDIDATE");
    seen.add(key);
    return record;
  });
}
