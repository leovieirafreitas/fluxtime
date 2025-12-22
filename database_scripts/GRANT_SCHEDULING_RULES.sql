-- Grant permissions for the scheduling rules RPC
GRANT EXECUTE ON FUNCTION get_public_scheduling_rules(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_scheduling_rules(text) TO anon, authenticated; -- Just in case there's a text variant or overload
