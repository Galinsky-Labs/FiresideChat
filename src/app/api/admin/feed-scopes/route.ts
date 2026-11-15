import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { HostReviewRequestError, readHostReviewForm } from "@/lib/host-review-request";
import { FeedReviewError } from "@/lib/feed-review";
import { activateReviewedFeed, attachFeedEpisode, attachFeedHost,
  decideFeedScope, submitFeedScope } from "@/lib/feed-review-store";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const privateHeaders={"Cache-Control":"no-store, private"};
export async function POST(request:NextRequest){
 if(!(await isAdminAuthenticated()))
   return NextResponse.json({error:"Unauthorized"},{status:401,headers:privateHeaders});
 // Cookies alone never authorize state-changing cross-site form submissions.
 if(!request.headers.get("origin") || request.headers.get("origin")!==new URL(request.url).origin)
   return NextResponse.json({error:"Invalid origin"},{status:403,headers:privateHeaders});
 const media=(request.headers.get("content-type")??"").split(";",1)[0]?.trim().toLowerCase();
 if(media!=="application/x-www-form-urlencoded")
   return NextResponse.json({error:"Unsupported form"},{status:415,headers:privateHeaders});
 try {
   const input=await readHostReviewForm(request);
   switch(input.action){
     case "submit":await submitFeedScope(input);break;
     case "host":await attachFeedHost(input);break;
     case "episode":await attachFeedEpisode(input);break;
     case "review":await decideFeedScope(input);break;
     case "activate":await activateReviewedFeed(input);break;
     default:throw new FeedReviewError("INVALID_ACTION");
   }
   return NextResponse.redirect(new URL("/admin/feed-scopes?updated=1",request.url),303);
 }catch(error){
   if(error instanceof HostReviewRequestError)
     return NextResponse.json({error:"Invalid request"},{status:error.status,headers:privateHeaders});
   const stale=error instanceof FeedReviewError && /STALE|FEED_CHANGED|NOT_APPROVED/.test(error.code);
   const duplicate=error&&typeof error==="object"&&"code" in error&&error.code==="P2002";
   const reason=stale?"stale":duplicate?"duplicate":error instanceof FeedReviewError?"invalid":"unavailable";
   return NextResponse.redirect(new URL("/admin/feed-scopes?error="+reason,request.url),303);
 }
}
