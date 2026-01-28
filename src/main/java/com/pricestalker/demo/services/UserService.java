package com.pricestalker.demo.services;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetailsService;
import lombok.AllArgsConstructor;
import java.util.Optional;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import com.pricestalker.demo.repositories.UserRepository;
import com.pricestalker.demo.entities.User;

@Service
@AllArgsConstructor
public class UserService implements UserDetailsService {
    
    @Autowired
    private UserRepository repository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        Optional<User> user = repository.findByUsername(username);
        if (user.isPresent()) {

            var userObj = user.get();
            return org.springframework.security.core.userdetails.User.builder()
                .username(userObj.getUsername())
                .password(userObj.getPassword())
                .roles("USER")
                .build();
        }else {
            throw new UsernameNotFoundException(username);
        }
    }
    
}
