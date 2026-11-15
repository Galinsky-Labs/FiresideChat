const hostRoles=["HOST","COHOST","OFFICIAL_PRODUCER"] as const;

export function NewFeedScopeForm({podcasts}:{podcasts:readonly {id:string;title:string;rssUrl:string}[]}){
 return <form action="/api/admin/feed-scopes" method="post" className="studio-admin-card">
  <h3>Submit a candidate feed identity for review</h3>
  <input type="hidden" name="action" value="submit" />
  <p><label>Registered show <select name="podcastId" required>
    {podcasts.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
  </select></label></p>
  <p><label>Candidate exact canonical HTTPS feed URL <input type="url" name="feedUrl" required maxLength={2048}/></label></p>
  <p><label>Expected publisher show title (exact feed snapshot) <input name="publishedTitle" required maxLength={200}/></label></p>
  <p><label>Expected publisher website (optional) <input type="url" name="publishedWebsite" maxLength={2048}/></label></p>
  <p><label>Feed scope <select name="mode" defaultValue="SHARED">
    <option value="SHARED">Shared or network feed (each episode must be verified)</option>
    <option value="DEDICATED">Dedicated show feed (date-bound host evidence required)</option>
  </select></label></p>
  <button type="submit">Create pending source review</button>
 </form>;
}

export function FeedScopeActions({id,revision,status,currentFeedUrl}:{
 id:string;revision:number;status:string;currentFeedUrl:string;
}){
 if(status==="APPROVED")return <form action="/api/admin/feed-scopes" method="post">
  <input type="hidden" name="action" value="activate"/>
  <input type="hidden" name="scopeId" value={id}/>
  <input type="hidden" name="revision" value={revision}/>
  <input type="hidden" name="expectedCurrentUrl" value={currentFeedUrl}/>
  <p>Activation is an explicit operator action. It changes the canonical feed for future ingestion while retaining historical episodes.</p>
  <button type="submit">Activate reviewed feed</button>
 </form>;
 if(status!=="PENDING")return <p>Closed decision; no revisions to this approved/rejected record.</p>;
 return <section aria-label="Source evidence review">
  <form action="/api/admin/feed-scopes" method="post">
   <h3>Append verified host-period claim</h3>
   <input type="hidden" name="action" value="host"/>
   <input type="hidden" name="scopeId" value={id}/>
   <input type="hidden" name="revision" value={revision}/>
   <p><label>Person database ID (exact, not name matching) <input name="personId" required maxLength={128}/></label></p>
   <p><label>Role <select name="role">{hostRoles.map(role=><option key={role} value={role}>{role}</option>)}</select></label></p>
   <p><label>Host start (documented) <input name="fromOn" type="date" required /></label></p>
   <p><label>Host end <input name="toOn" type="date" /></label></p>
   <p><label>Publisher host-credit citation <input name="sourceUrl" type="url" maxLength={2048} required /></label></p>
   <p><label>Citation observed on <input name="observedOn" type="date" required /></label></p>
   <button type="submit">Record host citation</button>
  </form>
  <form action="/api/admin/feed-scopes" method="post">
   <h3>Approve individual shared-feed episode evidence</h3>
   <input type="hidden" name="action" value="episode"/>
   <input type="hidden" name="scopeId" value={id}/>
   <input type="hidden" name="revision" value={revision}/>
   <p><label>Exact publisher GUID <input name="guid" maxLength={1024} required /></label></p>
   <p><label>Original episode source URL <input name="sourceUrl" type="url" maxLength={2048} required /></label></p>
   <p><label>Source observed on <input name="observedOn" type="date" required /></label></p>
   <button type="submit">Add episode citation</button>
  </form>
  <form action="/api/admin/feed-scopes" method="post">
   <h3>Editorial decision (does not activate feed)</h3>
   <input type="hidden" name="action" value="review"/>
   <input type="hidden" name="scopeId" value={id}/>
   <input type="hidden" name="revision" value={revision}/>
   <p><label>Decision <select name="decision"><option value="REJECTED">Reject candidate</option><option value="APPROVED">Approve source-bound candidate</option></select></label></p>
   <p><label>Editorial source citation <input name="reviewSourceUrl" type="url" maxLength={2048} required /></label></p>
   <p><label>Evidence reviewed on <input name="reviewedOn" type="date" required /></label></p>
   <p><label>Reason including publisher and official identity <textarea name="reviewNote" required minLength={20} maxLength={2000} /></label></p>
   <button type="submit">Record reviewed source decision</button>
  </form>
 </section>;
}
