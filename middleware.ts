import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDefaultRouteForRole, isAdminRole } from "@/lib/auth/roles";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/unauthorized",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

function isAllowedForPath(pathname: string, role: string | undefined) {
  if (!role) return false;
  // super_admin can access everything
  if (role === "super_admin") return true;
  if (pathname.startsWith("/admin")) return isAdminRole(role);
  if (pathname.startsWith("/agent")) return role === "agent";
  if (pathname.startsWith("/policyholder")) return role === "policyholder";
  return true;
}

async function resolveEffectiveRole(
  supabase: ReturnType<typeof createServerClient>,
  metadataRole: string | undefined,
) {
  let role = metadataRole;
  const { data: roleFromDb, error } = await supabase.rpc("current_user_role_key");
  if (!error && typeof roleFromDb === "string" && roleFromDb) {
    role = roleFromDb;
  }
  return role;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicPath(pathname)) {
    // Only redirect away from login/signup if user has a valid role destination
    if (user && (pathname === "/login" || pathname === "/signup")) {
      const metadataRole = user.user_metadata?.role as string | undefined;
      const role = await resolveEffectiveRole(supabase, metadataRole);
      const dest = getDefaultRouteForRole(role);
      if (dest !== "/login") {
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return response;
  }

  // Protected route — must be authenticated
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  const metadataRole = user.user_metadata?.role as string | undefined;
  const role = await resolveEffectiveRole(supabase, metadataRole);
  if (!isAllowedForPath(pathname, role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
