const roles = ["HOST","COHOST","OFFICIAL_PRODUCER","GUEST","UNKNOWN"] as const;
const evidenceKinds = ["HOST_CREDIT","COHOST_CREDIT","OFFICIAL_PRODUCTION","NETWORK_ONLY","GUEST_APPEARANCE","OTHER"] as const;

/** The operator's entry stays pending. This form never enrolls a podcast. */
export function NewHostCandidateForm() {
  return <form action="/api/admin/host-reviews" method="post" className="studio-admin-card">
    <h3>Submit an unverified relationship</h3>
    <input type="hidden" name="action" value="submit" />
    <p><label>Stable official key (BioGuide or President) <input name="officialKey" required maxLength={64} placeholder="BIOGUIDE:A123456" /></label></p>
    <p><label>Official name <input name="officialName" required maxLength={150} /></label></p>
    <p><label>Identity source URL <input name="identitySourceUrl" type="url" required maxLength={2048} /></label></p>
    <p><label>Show slug <input name="showKey" required maxLength={120} /></label></p>
    <p><label>Show title <input name="showTitle" required maxLength={200} /></label></p>
    <p><label>Proposed role <select name="proposedRole" defaultValue="UNKNOWN">{roles.map(r=><option key={r} value={r}>{r}</option>)}</select></label></p>
    <p><label>Candidate feed (optional; unverified) <input name="feedCandidateUrl" type="url" maxLength={2048} /></label></p>
    <p><label>Host role starts (source-backed, required before verification) <input name="hostStartOn" type="date" /></label></p>
    <p><label>Host role ends (optional) <input name="hostEndOn" type="date" /></label></p>
    <fieldset><legend>Optional initial citation - complete all fields when included</legend>
      <p><label>Source kind <select name="kind">{evidenceKinds.map(k=><option key={k} value={k}>{k}</option>)}</select></label></p>
      <p><label>Publisher citation URL <input name="sourceUrl" type="url" maxLength={2048} /></label></p>
      <p><label>Publisher excerpt <textarea name="excerpt" rows={3} maxLength={1600} /></label></p>
      <p><label>Evidence observation date <input name="observedOn" type="date" /></label></p>
    </fieldset>
    <button type="submit">Add pending candidate</button>
  </form>;
}

export function HostEvidenceAndReviewForms({candidateId,revision,role,starts,ends}:{candidateId:string;revision:number;role:string;starts:string;ends:string}) {
  return <section aria-label="Private evidence and review actions">
    <form action="/api/admin/host-reviews" method="post">
      <input type="hidden" name="action" value="amend" />
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="revision" value={revision} />
      <h3>Correct the unapproved role and host dates</h3>
      <p><label>Proposed role <select name="proposedRole" defaultValue={role}>{roles.map(r=><option value={r} key={r}>{r}</option>)}</select></label></p>
      <p><label>Role starts <input type="date" name="hostStartOn" defaultValue={starts} /></label></p>
      <p><label>Role ends, if known <input type="date" name="hostEndOn" defaultValue={ends} /></label></p>
      <p><label>Why is the claim changing? <textarea name="amendNote" required minLength={20} maxLength={2000} /></label></p>
      <button type="submit">Update pending claim</button>
    </form>
    <form action="/api/admin/host-reviews" method="post">
      <input name="action" type="hidden" value="evidence" />
      <input name="candidateId" type="hidden" value={candidateId} />
      <input name="revision" type="hidden" value={revision} />
      <h3>Append a source citation</h3>
      <p><label>Evidence kind <select name="kind">{evidenceKinds.map(k=><option key={k} value={k}>{k}</option>)}</select></label></p>
      <p><label>Original source URL <input name="sourceUrl" type="url" maxLength={2048} required /></label></p>
      <p><label>Verbatim publisher statement <textarea name="excerpt" minLength={12} maxLength={1600} required /></label></p>
      <p><label>Observed on <input name="observedOn" type="date" required /></label></p>
      <button type="submit">Append evidence</button>
    </form>
    <form action="/api/admin/host-reviews" method="post">
      <input name="action" type="hidden" value="review" />
      <input name="candidateId" type="hidden" value={candidateId} />
      <input name="revision" type="hidden" value={revision} />
      <h3>Record editorial decision</h3>
      <p>Verification requires a matching host/cohost/official-production credit and a source-backed start date. Network ownership or guest appearances alone do not qualify.</p>
      <p><label>Decision <select name="decision" defaultValue="REQUEST_EVIDENCE">
        <option value="REQUEST_EVIDENCE">Request more evidence</option>
        <option value="VERIFY">Verify the specific role and date range</option>
        <option value="EXCLUDE_GUEST">Exclude a guest-only appearance</option>
        <option value="REJECT">Reject this candidate</option>
      </select></label></p>
      <p><label>Source-backed reviewer rationale <textarea name="reviewNote" required minLength={20} maxLength={2000} /></label></p>
      <button type="submit">Save authenticated review decision</button>
    </form>
  </section>;
}
