import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaTwitter, FaDiscord, FaHeart } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h3>🎮 Steam Clone</h3>
          <p>Your ultimate gaming platform</p>
        </div>

        <div className="footer-social">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            <FaGithub />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <FaTwitter />
          </a>
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
            <FaDiscord />
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Made with <FaHeart className="heart" /> by Steam Clone Team</p>
        <p>&copy; {currentYear} Steam Clone. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;