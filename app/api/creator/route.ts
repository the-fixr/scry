import { NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 });
  }

  if (!NEYNAR_API_KEY) {
    return NextResponse.json({ error: 'Neynar not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address.toLowerCase()}`,
      { headers: { 'x-api-key': NEYNAR_API_KEY }, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json(null);
    }

    const data = await res.json();
    // Response shape: { [address]: [{ fid, username, display_name, pfp_url, follower_count, ... }] }
    const users = data?.[address.toLowerCase()];
    if (!users || users.length === 0) {
      return NextResponse.json(null);
    }

    const user = users[0];
    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      followerCount: user.follower_count,
      verifiedAddresses: user.verified_addresses?.eth_addresses ?? [],
    });
  } catch (err) {
    console.error('[api/creator] Neynar lookup error:', err);
    return NextResponse.json(null);
  }
}
