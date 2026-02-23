import React, { useMemo } from 'react';
import { Avatar, Button, Dropdown, Space } from 'antd';
import { Link } from 'react-router-dom';
import { useGlobalContext } from '../context/globalContext';
import { getAvatarSrc, getInitials } from '../utils/avatar';

const UserMenu = () => {
  const { user, logoutUser } = useGlobalContext();
  const initials = getInitials(user?.name || 'User');
  const avatarSrc = getAvatarSrc({
    avatarDataUrl: user?.avatarDataUrl || '',
    name: user?.name || 'User'
  });

  const menuItems = useMemo(
    () => [
      { key: 'profile', label: <Link to="/profile">Profile</Link> },
      { key: 'logout', label: <span onClick={logoutUser}>Logout</span> }
    ],
    [logoutUser]
  );

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <Button type="text">
        <Space>
          <Avatar src={avatarSrc}>{initials}</Avatar>
          {user?.name || 'User'}
        </Space>
      </Button>
    </Dropdown>
  );
};

export default UserMenu;
