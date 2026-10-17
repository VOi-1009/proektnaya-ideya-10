def grant_supporter(cur, schema: str, uid: int) -> None:
    cur.execute(f"SELECT supporter_no, is_creator FROM {schema}.users WHERE id = {int(uid)}")
    r = cur.fetchone()
    if not r or r[0] is not None:
        return
    cur.execute(f"SELECT COALESCE(MAX(supporter_no), 0) + 1 FROM {schema}.users")
    no = int(cur.fetchone()[0])
    promo = "" if r[1] else f", promo_code = 'BAA{no:04d}'"
    cur.execute(f"UPDATE {schema}.users SET supporter_no = {no}, supported_at = COALESCE(supported_at, NOW()){promo} WHERE id = {int(uid)}")
