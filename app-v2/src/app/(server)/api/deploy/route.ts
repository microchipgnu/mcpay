import { auth } from '@/lib/gateway/auth';
import { NextResponse } from 'next/server';
import { deployWithGitHub, type DeployRequestInput } from './actions';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const input = (await req.json()) as DeployRequestInput;
    const result = await deployWithGitHub(input, userId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deployment failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


