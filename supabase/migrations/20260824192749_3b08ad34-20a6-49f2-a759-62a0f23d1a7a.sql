revoke execute on function public.is_workspace_owner(uuid, uuid) from anon, public;
revoke execute on function public.is_workspace_member(uuid, uuid) from anon, public;
grant execute on function public.is_workspace_owner(uuid, uuid) to authenticated;
grant execute on function public.is_workspace_member(uuid, uuid) to authenticated;