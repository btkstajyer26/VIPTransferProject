function AdminTopbar() {
  return (
    <header className="admin-topbar">
      <div>
        <h1>Yönetim Paneli</h1>
        <p>VIP Transfer operasyonlarını yönetin.</p>
      </div>

      <div className="admin-profile">
        <div className="admin-avatar">A</div>

        <div>
          <strong>Admin</strong>
          <span>Yönetici</span>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;