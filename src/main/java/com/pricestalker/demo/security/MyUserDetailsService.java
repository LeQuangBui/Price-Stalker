package com.pricestalker.demo.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.pricestalker.demo.entities.User;
import com.pricestalker.demo.repositories.UserRepository;

@Service
public class MyUserDetailsService implements UserDetailsService{
	@Autowired
	private UserRepository userRepository;
	
	@Override
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		User user = this.userRepository.findByUsername(username);
		
		if (user == null) {
			throw new UsernameNotFoundException("This user does not exist in the database");
		}
		
		return new UserPrincipal(user);
	}
	
}
